/// <reference lib="dom.asynciterable" />
import { bodylessMethods } from '@alien-rpc/route'
import * as jsonQS from '@json-qs/json-qs'
import ky, { HTTPError } from 'ky'
import { buildPath } from 'pathic'
import { isPromise, isString } from 'radashi'
import jsonFormat from './formats/json.js'
import responseFormat from './formats/response.js'
import {
  CachedRouteResult,
  ClientOptions,
  ErrorMode,
  ResponseStream,
  ResultFormatter,
  Route,
  RoutePathname,
  RouteResponseByPath,
  RouteResultCache,
} from './types.js'

interface ClientPrototype<API extends Record<string, Route>> {
  extend: (defaults: ClientOptions) => Client<API>
  request: typeof ky
  getCachedResponse: <P extends RoutePathname<API>>(
    path: P
  ) => CachedRouteResult<Awaited<RouteResponseByPath<API, P>>> | undefined
  setCachedResponse: <P extends RoutePathname<API>>(
    path: P,
    response: CachedRouteResult<Awaited<RouteResponseByPath<API, P>>>
  ) => void
  unsetCachedResponse: <P extends RoutePathname<API>>(path: P) => void
}

export type Client<
  API extends Record<string, Route> = Record<string, Route>,
  Options extends ClientOptions = ClientOptions,
> = ClientPrototype<API> & {
  [TKey in keyof API]: Extract<API[TKey], Route>['callee'] extends (
    ...args: infer TArgs
  ) => infer TResult
    ? (
        ...args: TArgs
      ) => TResult extends ResponseStream<any>
        ? TResult
        : Options['errorMode'] extends 'return'
          ? Promise<[Error, undefined] | [undefined, Awaited<TResult>]>
          : TResult
    : never
}

export function defineClient<
  API extends Record<string, Route>,
  Options extends ClientOptions = ClientOptions,
>(routes: API, options = {} as Options): Client<API, Options> {
  const { errorMode = 'reject', resultCache = new Map(), ...defaults } = options
  const { hooks } = defaults

  return createClientProxy(
    routes,
    errorMode,
    resultCache,
    ky.create({
      ...defaults,
      prefixUrl: defaults.prefixUrl ?? '/',
      hooks: {
        ...hooks,
        beforeError: mergeHooks(hooks?.beforeError, extendHTTPError, 'start'),
      },
    })
  )
}

async function extendHTTPError(error: HTTPError) {
  const { request, response } = error
  if (response.headers.get('Content-Type') === 'application/json') {
    const errorInfo = await response.json<any>()
    Object.assign(error, errorInfo)
  }
  return error
}

function createClientProxy<
  API extends Record<string, Route>,
  Options extends ClientOptions,
>(
  routes: API,
  errorMode: ErrorMode,
  resultCache: RouteResultCache,
  request: typeof ky
): Client<API, Options> {
  const client: ClientPrototype<API> = {
    extend: defaults =>
      createClientProxy(
        routes,
        defaults.errorMode ?? errorMode,
        defaults.resultCache ?? resultCache,
        request.extend(defaults)
      ),
    request,
    getCachedResponse(path) {
      return resultCache.get(path) as any
    },
    setCachedResponse(path, response) {
      resultCache.set(path, response)
    },
    unsetCachedResponse(path) {
      resultCache.delete(path)
    },
  }

  return new Proxy(client, {
    get(client, key, proxy) {
      if (Object.prototype.hasOwnProperty.call(routes, key)) {
        return createRouteFunction(
          routes[key as keyof API],
          errorMode,
          resultCache,
          request,
          proxy
        )
      }
      if (client.hasOwnProperty(key)) {
        return client[key as keyof ClientPrototype<API>]
      }
    },
  }) as any
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
    } else {
      body = params
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

function mergeHooks<T>(
  hooks: T[] | undefined,
  hook: T | undefined,
  position: 'start' | 'end'
) {
  return hook
    ? hooks
      ? position === 'start'
        ? [hook, ...hooks]
        : [...hooks, hook]
      : [hook]
    : hooks
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

function isObject(arg: unknown) {
  return Object.getPrototypeOf(arg) === Object.prototype
}
