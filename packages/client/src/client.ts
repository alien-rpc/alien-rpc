/// <reference lib="dom.asynciterable" />
import { bodylessMethods } from '@alien-rpc/route'
import * as jsonQS from '@json-qs/json-qs'
import { buildPath } from 'pathic'
import { isPromise, isString, omit, shake, sleep } from 'radashi'
import { HTTPError } from './error'
import jsonFormat from './formats/json.js'
import responseFormat from './formats/response.js'
import {
  CachedResponse,
  ClientOptions,
  ClientRoutes,
  ErrorMode,
  PathsProxy,
  RequestOptions,
  ResolvedClientOptions,
  ResultFormatter,
  Route,
  RouteFunctions,
  RoutePathname,
  RouteResultCache,
} from './types.js'
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
  const { prefixUrl = location.origin } = client.options

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
  return new Proxy(client, {
    get(client, key, proxy) {
      const route = routes[key as keyof API]
      if (route) {
        if (isRouteDefinition(route)) {
          return createRouteFunction(
            route,
            client.options.errorMode!,
            client.options.resultCache!,
            client.fetch,
            proxy
          )
        }
        return createClientProxy(route, client)
      }
      if (client.hasOwnProperty(key)) {
        return client[key as keyof ClientPrototype<API>]
      }
    },
  })
}

function createRouteFunction(
  route: Route,
  errorMode: ErrorMode,
  resultCache: RouteResultCache,
  fetch: Fetch,
  client: Client
) {
  const format = resolveResultFormat(route.format)

  return (
    arg: unknown,
    options = route.arity === 1
      ? (arg as RequestOptions | undefined)
      : undefined
  ) => {
    let params: Record<string, any> | undefined
    if (route.arity === 2 && arg != null) {
      if (isObject(arg)) {
        params = arg
      } else if (route.pathParams.length) {
        params = { [route.pathParams[0]]: arg }
      } else {
        throw new Error('No path parameters found for route: ' + route.path)
      }
    }

    let path = buildPath(route.path, params ?? {})
    let body: unknown

    if (bodylessMethods.has(route.method)) {
      if (params) {
        const query = jsonQS.encode(params, {
          skippedKeys: route.pathParams,
        })
        if (query) {
          path += '?' + query
        }
      }
      if (route.method === 'GET' && resultCache.has(path)) {
        return format.mapCachedResult(resultCache.get(path), client)
      }
    } else if (params) {
      body = omit(params, route.pathParams)
    }

    const promisedResponse = fetch(path, {
      ...options,
      json: body,
      method: route.method,
    })

    if (errorMode === 'return') {
      const result = format.parseResponse(promisedResponse, client)
      if (isPromise(result)) {
        return result.then(
          result => [undefined, result],
          error => [error, undefined]
        )
      }
      return result
    }
    return format.parseResponse(promisedResponse, client)
  }
}

function resolveResultFormat(format: Route['format']): ResultFormatter {
  if (format === 'response') {
    return responseFormat
  }
  if (format === 'json') {
    return jsonFormat
  }
  if (isString(format)) {
    throw new Error('Unsupported route format: ' + format)
  }
  return format
}

function isRouteDefinition(obj: any): obj is Route {
  return !!obj && isString(obj.method) && isString(obj.path)
}

function isObject(arg: {}) {
  return Object.getPrototypeOf(arg) === Object.prototype
}

function createPathsProxy<API extends ClientRoutes>(
  routes: API,
  options: ClientOptions
): any {
  return new Proxy(routes, {
    get(routes, key) {
      const route = routes[key as keyof API]
      if (route) {
        if (isRouteDefinition(route)) {
          const { prefixUrl = location.origin } = options
          if (route.pathParams.length) {
            return (params: {}) =>
              joinURL(prefixUrl, buildPath(route.path, params))
          }
          return joinURL(prefixUrl, route.path)
        }
        return createPathsProxy(route, options)
      }
    },
  })
}

function joinURL(prefixUrl: string | URL, path: string) {
  const newUrl = new URL(prefixUrl)
  if (!newUrl.pathname.endsWith('/')) {
    newUrl.pathname += '/'
  }
  newUrl.pathname += path
  return newUrl.href
}
