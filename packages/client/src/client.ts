/// <reference lib="dom.asynciterable" />
import { bodylessMethods } from '@alien-rpc/route'
import * as jsonQS from '@json-qs/json-qs'
import ky, { HTTPError, TimeoutError } from 'ky'
import { buildPath } from 'pathic'
import { isFunction, isPromise, isString, omit } from 'radashi'
import jsonFormat from './formats/json.js'
import responseFormat from './formats/response.js'
import {
  CachedResponse,
  ClientOptions,
  ClientRoutes,
  ErrorMode,
  PathsProxy,
  ResolvedClientOptions,
  ResultFormatter,
  Route,
  RouteFunctions,
  RoutePathname,
  RouteResultCache,
} from './types.js'
import { mergeOptions } from './utils/mergeOptions.js'

type ClientPrototype<
  API extends ClientRoutes,
  TErrorMode extends ErrorMode = ErrorMode,
> = {
  readonly request: typeof ky
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

export { HTTPError, TimeoutError }

export type Client<
  API extends ClientRoutes = any,
  TErrorMode extends ErrorMode = ErrorMode,
> = ClientPrototype<API, TErrorMode> & RouteFunctions<API, TErrorMode>

export function defineClient<
  API extends ClientRoutes,
  TErrorMode extends ErrorMode = ErrorMode,
>(
  routes: API,
  options: ClientOptions<TErrorMode> = {},
  parent?: Client | undefined
): Client<API, TErrorMode> {
  const mergedOptions = mergeOptions(parent?.options, options)
  const { resultCache } = mergedOptions

  let request: typeof ky | undefined

  const client: Client<API, TErrorMode> = createClientProxy(routes, {
    options: mergedOptions,
    get request() {
      return (request ??= createRequest(client))
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

async function extendHTTPError(error: HTTPError) {
  const { response } = error
  if (response.headers.get('Content-Type') === 'application/json') {
    const errorInfo = await response.json<any>()
    Object.assign(error, errorInfo)
  }
  return error
}

function createRequest(client: Client) {
  let { hooks, prefixUrl = '/' } = client.options

  if (isFunction(hooks)) {
    hooks = hooks(client)
  }

  hooks ??= {}
  hooks.beforeError = insertHook(hooks.beforeError, extendHTTPError, prepend)

  return ky.create({
    ...client.options,
    prefixUrl,
    hooks,
  })
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
            client.request,
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
  request: typeof ky,
  client: Client
) {
  const format = resolveResultFormat(route.format)

  return (
    arg: unknown,
    options = route.arity === 1
      ? (arg as import('ky').Options | undefined)
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

    const promisedResponse = request(path, {
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

function insertHook<T>(
  hooks: T[] | undefined,
  hook: T | undefined,
  insert: (hooks: T[], hook: T) => T[]
) {
  return hook ? (hooks ? insert(hooks, hook) : [hook]) : hooks
}

function prepend<T>(array: T[], newValue: T) {
  return [newValue, ...array]
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
          if (route.pathParams.length) {
            return (params: {}) =>
              joinURL(options.prefixUrl, buildPath(route.path, params))
          }
          return joinURL(options.prefixUrl, route.path)
        }
        return createPathsProxy(route, options)
      }
    },
  })
}

function joinURL(prefixUrl: string | URL | undefined, path: string) {
  const newUrl = new URL(prefixUrl ?? location.origin)
  if (!newUrl.pathname.endsWith('/')) {
    newUrl.pathname += '/'
  }
  newUrl.pathname += path
  return newUrl.href
}
