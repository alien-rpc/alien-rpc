/// <reference lib="dom.asynciterable" />
import { isObject, isString, shake, sleep } from 'radashi'
import { HTTPError } from './error.js'
import http from './protocols/http.js'
import {
  ClientOptions,
  ClientRoutes,
  ErrorMode,
  PathsProxy,
  RequestOptions,
  ResolvedClientOptions,
  RouteFunctions,
  RouteProtocol,
} from './types.js'
import { iterateHooks } from './utils/callHook.js'
import { mergeHeaders } from './utils/mergeHeaders.js'
import { mergeOptions } from './utils/mergeOptions.js'
import { getShouldRetry, ShouldRetryFunction } from './utils/retry.js'
import { urlWithPathname } from './utils/url.js'

type Fetch = (
  path: string,
  options?: RequestOptions & {
    body?: RequestInit['body']
    json?: unknown
    method?: string
    query?: string
  }
) => Promise<Response>

type ClientPrototype<
  API extends ClientRoutes,
  TErrorMode extends ErrorMode = ErrorMode,
> = {
  readonly fetch: Fetch
  readonly options: Readonly<ResolvedClientOptions<TErrorMode>>
  readonly paths: PathsProxy<API>
  ws?: WebSocket

  extend<TNewErrorMode extends ErrorMode = TErrorMode>(
    defaults: ClientOptions<TNewErrorMode>
  ): Client<API, TNewErrorMode>
}

export type Client<
  API extends ClientRoutes = any,
  TErrorMode extends ErrorMode = ErrorMode,
> = ClientPrototype<API, TErrorMode> & RouteFunctions<API, TErrorMode>

export function defineClient<
  API extends ClientRoutes,
  TErrorMode extends ErrorMode = ErrorMode,
>(
  routes: API,
  options: ClientOptions<TErrorMode>,
  parent?: Client | undefined
): Client<API, TErrorMode> {
  const mergedOptions = mergeOptions(parent?.options, options)

  let fetch: Fetch | undefined

  const client: Client<API, TErrorMode> = createClientProxy(routes, {
    options: mergedOptions,
    get fetch() {
      return (fetch ??= createFetchFunction(client))
    },
    get paths() {
      return createPathsProxy(routes, client.options) as any
    },
    extend(options) {
      return defineClient(routes, options, client)
    },
  })

  return client
}

function createFetchFunction(client: Client): Fetch {
  const {
    prefixUrl = location.origin,
    fetch = globalThis.fetch,
    hooks,
  } = client.options

  const tryRequest = async (
    request: Request,
    shouldRetry: ShouldRetryFunction
  ) => {
    let response = await fetch(request)
    for (const afterResponse of iterateHooks(hooks, 'afterResponse')) {
      const newResponse = await afterResponse({ request, response })
      if (newResponse instanceof Response) {
        response = newResponse
      }
    }
    if (response.status >= 400) {
      const retryDelay = shouldRetry(response)
      if (retryDelay !== false) {
        request.signal.throwIfAborted()
        await sleep(retryDelay)
        return tryRequest(request, shouldRetry)
      }
      let error = new HTTPError(request, response)
      if (response.headers.get('Content-Type') === 'application/json') {
        Object.assign(error, await response.json())
      }
      for (const beforeError of iterateHooks(hooks, 'beforeError')) {
        error = await beforeError(error)
      }
      throw error
    }
    return response
  }

  return (input, { query, headers, json, ...init } = {}) => {
    headers = mergeHeaders(client.options.headers, headers)
    if (json) {
      headers ??= new Headers()
      headers.set('Content-Type', 'application/json')
      init.body = JSON.stringify(json)
    }
    const queryIndex = input.indexOf('?')
    const url = urlWithPathname(
      prefixUrl,
      queryIndex === -1 ? input : input.slice(0, queryIndex)
    )
    if (query) {
      url.search = query
    } else if (queryIndex !== -1) {
      url.search = input.slice(queryIndex + 1)
    }
    const request = new Request(url.href, {
      ...client.options,
      ...(init && shake(init)),
      headers,
    })
    return tryRequest(request, getShouldRetry(request, client.options.retry))
  }
}

function createClientProxy<API extends ClientRoutes>(
  routes: API,
  client: ClientPrototype<API>,
  keyPrefix = ''
): any {
  const propertyCache = new Map<keyof any, any>()

  return new Proxy(client, {
    get(client, key: string) {
      const route = routes[key as keyof API]
      if (route) {
        let value = propertyCache.get(key)
        if (!value) {
          const protocol = resolveRouteProtocol(route)
          value = protocol
            ? protocol.createFunction(route, client, keyPrefix + key)
            : createClientProxy(
                route as ClientRoutes,
                client,
                keyPrefix + key + '.'
              )

          propertyCache.set(key, value)
        }
        return value
      }
      if (client.hasOwnProperty(key)) {
        return client[key as keyof ClientPrototype<API>]
      }
    },
  })
}

function createPathsProxy<API extends ClientRoutes>(
  routes: API,
  options: ClientOptions
): any {
  return new Proxy(routes, {
    get(routes, key) {
      const route = routes[key as keyof API]
      if (route) {
        const protocol = resolveRouteProtocol(route)
        return protocol
          ? protocol.getURL(route, options)
          : createPathsProxy(route as ClientRoutes, options)
      }
    },
  })
}

function resolveRouteProtocol(
  route: ClientRoutes[string]
): RouteProtocol<any> | undefined {
  if ('method' in route && isString(route.method)) {
    return http
  }
  if (
    'protocol' in route &&
    isObject(route.protocol) &&
    'createFunction' in route.protocol
  ) {
    return route.protocol
  }
}
