/// <reference lib="dom.asynciterable" />
import { bodylessMethods } from '@alien-rpc/route'
import * as jsonQS from '@json-qs/json-qs'
import { buildPath } from 'pathic'
import { isObject, isString, shake, sleep } from 'radashi'
import { HTTPError } from './error.js'
import { resolveStackTrace } from './node/sourcemap.js'
import http from './protocols/http.js'
import { kClientProperty, kRouteProperty } from './symbols.js'
import type {
  ClientOptions,
  ClientRoutes,
  ErrorMode,
  FetchOptions,
  ResolvedClientOptions,
  Route,
  RouteFunctions,
  RouteProtocol,
  RouteTypeInfo,
} from './types.js'
import { iterateHooks } from './utils/callHook.js'
import { mergeHeaders } from './utils/mergeHeaders.js'
import { mergeOptions } from './utils/mergeOptions.js'
import { getShouldRetry, type ShouldRetryFunction } from './utils/retry.js'
import { urlWithPathname } from './utils/url.js'

type Fetch = (path: string, options?: FetchOptions) => Promise<Response>

type ClientPrototype<
  API extends ClientRoutes,
  TErrorMode extends ErrorMode = ErrorMode,
> = {
  readonly fetch: Fetch
  readonly options: Readonly<ResolvedClientOptions<TErrorMode>>
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
  TErrorMode extends ErrorMode = 'reject',
>(
  routes: API,
  options?: ClientOptions<TErrorMode>,
  parent?: Client | undefined
): Client<API, TErrorMode> {
  const mergedOptions = mergeOptions(parent?.options, options)

  let fetch: Fetch | undefined

  const client: Client<API, TErrorMode> = createClientProxy(routes, {
    options: mergedOptions,
    get fetch() {
      return (fetch ??= createFetchFunction(client))
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
    shouldRetry: ShouldRetryFunction,
    timeout: number
  ) => {
    let response: Response
    if (timeout > 0) {
      const timeoutCtrl = new AbortController()
      const timeoutId = setTimeout(() => {
        timeoutCtrl.abort(new DOMException('Request timed out', 'TimeoutError'))
      }, timeout * 1000)

      response = await fetch(
        new Request(request, {
          signal: request.signal
            ? AbortSignal.any([timeoutCtrl.signal, request.signal])
            : timeoutCtrl.signal,
        })
      )
      clearTimeout(timeoutId)
    } else {
      response = await fetch(request)
    }
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
        return tryRequest(request, shouldRetry, timeout)
      }
      let error = new HTTPError(request, response)
      if (response.headers.get('Content-Type') === 'application/json') {
        const overrides = await response.json()
        if (process.env.NODE_ENV !== 'production') {
          overrides.stack = await resolveStackTrace(overrides.stack)
        }
        Object.assign(error, overrides)
      }
      for (const beforeError of iterateHooks(hooks, 'beforeError')) {
        error = await beforeError(error)
      }
      throw error
    }
    return response
  }

  return (input, { query, headers, json, timeout, ...init } = {}) => {
    headers = mergeHeaders(client.options.headers, headers)
    if (json !== undefined) {
      headers ||= new Headers()
      headers.set('Content-Type', 'application/json')
      init.body = JSON.stringify(json)
    } else if (init.body instanceof Blob) {
      headers ||= new Headers()
      headers.set('Content-Type', init.body.type ?? 'application/octet-stream')
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
    return tryRequest(
      request,
      getShouldRetry(request, client.options.retry),
      timeout ?? 60
    )
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
      if (Object.hasOwn(client, key)) {
        return client[key as keyof ClientPrototype<API>]
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

/**
 * Get the route information from a route function.
 *
 * Note: WebSocket routes are not supported by this function.
 *
 * ```ts
 * const client = defineClient(myRoutes, {…})
 * const route = getRouteFromFunction(client.myRoute)
 * route.method // 'GET'
 * route.path // '/my/route'
 * ```
 */
export function getRouteFromFunction<TRoute extends Route>(
  routeFunction: Function & RouteTypeInfo<TRoute>
): TRoute {
  return (routeFunction as any)[kRouteProperty]
}

/**
 * Get an absolute URL string for a route function.
 *
 * Note: WebSocket routes are not supported by this function.
 */
export function buildRouteURL(
  routeFunction: Function & RouteTypeInfo<Route.withOptionalParams>
): string

export function buildRouteURL<TRoute>(
  routeFunction: Function & RouteTypeInfo<TRoute>,
  params: Route.inferParams<TRoute>
): string

export function buildRouteURL(routeFunction: Function, params?: object | null) {
  const route = getRouteFromFunction(routeFunction as any)
  const { options }: Client = (routeFunction as any)[kClientProperty]
  const { prefixUrl = location.origin } = options
  const url = urlWithPathname(
    prefixUrl,
    route.pathParams ? buildPath(route.path, params ?? {}) : route.path
  )
  if (bodylessMethods.has(route.method) && params) {
    url.search = jsonQS.encode(params as any, {
      skippedKeys: route.pathParams,
    })
  }
  return url.href
}
