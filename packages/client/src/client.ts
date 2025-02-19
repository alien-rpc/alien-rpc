/// <reference lib="dom.asynciterable" />
import { isObject, isString, shake, sleep } from 'radashi'
import { HTTPError } from './error.js'
import http from './protocols/http.js'
import {
  CachedResponse,
  ClientOptions,
  ClientRoutes,
  ErrorMode,
  PathsProxy,
  RequestOptions,
  ResolvedClientOptions,
  RouteFunctions,
  RoutePathname,
  RouteProtocol,
} from './types.js'
import { joinURL } from './utils/joinURL.js'
import { mergeHeaders } from './utils/mergeHeaders.js'
import { mergeOptions } from './utils/mergeOptions.js'
import { getShouldRetry, ShouldRetryFunction } from './utils/retry.js'

type Fetch = (
  path: string,
  options?: RequestOptions & {
    body?: RequestInit['body']
    json?: unknown
    method?: string
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

  getCachedResponse<TPath extends RoutePathname<API>>(
    path: TPath
  ): CachedResponse<API, TPath> | undefined

  setCachedResponse<TPath extends RoutePathname<API>>(
    path: TPath,
    response: CachedResponse<API, TPath>
  ): void

  unsetCachedResponse<P extends RoutePathname<API>>(path: P): void
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
  const { resultCache } = mergedOptions

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
    getCachedResponse(path) {
      return resultCache.get(path) as any
    },
    setCachedResponse(path, response) {
      resultCache.set(path, response)
    },
    unsetCachedResponse(path) {
      resultCache.delete(path)
    },
  })

  return client
}

function createFetchFunction(client: Client): Fetch {
  const { prefixUrl = location.origin, fetch = globalThis.fetch } =
    client.options

  const tryRequest = async (
    request: Request,
    shouldRetry: ShouldRetryFunction
  ) => {
    const response = await fetch(request)
    if (response.status >= 400) {
      const retryDelay = shouldRetry(response)
      if (retryDelay !== false) {
        request.signal.throwIfAborted()
        await sleep(retryDelay)
        return tryRequest(request, shouldRetry)
      }
      const error = new HTTPError(request, response)
      throw response.headers.get('Content-Type') === 'application/json'
        ? Object.assign(error, await response.json())
        : error
    }
    return response
  }

  return (input, init) => {
    let headers = mergeHeaders(client.options.headers, init?.headers)
    if (init?.json) {
      headers ??= new Headers()
      headers.set('Content-Type', 'application/json')
      init.body = JSON.stringify(init.json)
    }
    const request = new Request(joinURL(prefixUrl, input), {
      ...client.options,
      ...(init && shake(init)),
      headers,
    })
    return tryRequest(request, getShouldRetry(request, client.options.retry))
  }
}

function createClientProxy<API extends ClientRoutes>(
  routes: API,
  client: ClientPrototype<API>
): any {
  const propertyCache = new Map<keyof any, any>()

  return new Proxy(client, {
    get(client, key) {
      const route = routes[key as keyof API]
      if (route) {
        let value = propertyCache.get(key)
        if (!value) {
          const protocol = resolveRouteProtocol(route)
          value = protocol
            ? protocol.createFunction(route, client, key as string)
            : createClientProxy(route as ClientRoutes, client)

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
