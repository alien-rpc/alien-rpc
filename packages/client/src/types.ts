import type { RouteMethod } from '@alien-rpc/route'
import type { InferParams, PathTemplate } from 'pathic'
import type { Any } from 'radashi'
import type { Client } from './client.js'
import { RetryOptions } from './utils/retry.js'

export type { RetryOptions }

/**
 * This must return a promise for `errorMode: 'return'` to work as
 * expected. Notably, the json-seq response parser doesn't return a
 * promise, and so it doesn't respect the `errorMode` setting.
 */
export type ResponseParser<TResult = unknown> = (
  promisedResponse: Promise<Response>,
  client: Client
) => TResult

export type AnyRoute = Route | ws.Route

type AnyFn = (...args: any) => any

export type Route<
  TPath extends string = string,
  TCallee extends AnyFn = AnyFn,
> = {
  method: RouteMethod
  path: TPath
  pathParams: string[]
  /**
   * The result format determines how the response must be handled for the
   * caller to receive the expected type.
   */
  format: string | ResponseParser<Awaited<ReturnType<TCallee>>>
  /**
   * Equals 1 if the route has no search parameters or request body.
   */
  arity: 1 | 2
  /**
   * The route's signature type. This property never actually exists at
   * runtime.
   */
  callee: TCallee
}

export type RouteProtocol<TRoute> = {
  name: string
  getURL: (
    route: TRoute,
    options: ClientOptions
  ) => string | ((params: {}) => string)
  createFunction: (route: TRoute, client: Client, routeName: string) => AnyFn
}

export declare namespace ws {
  export type Route<TCallee extends AnyFn = AnyFn> = {
    protocol: RouteProtocol<Route>
    /**
     * The route's messaging pattern.
     *
     * - `n`: One-way notification (no response).
     * - `r`: Request with one response.
     * - `s`: Subscription with multiple responses.
     */
    pattern: 'n' | 'r' | 's'
    // Doesn't exist at runtime.
    callee: TCallee
  }

  export type RequestOptions = {
    signal?: AbortSignal | undefined
  }

  export interface RequestError extends globalThis.Error {
    name: 'ws.RequestError'
    code: number
    data: unknown
  }

  export interface ConnectionError extends globalThis.Error {
    name: 'ws.ConnectionError'
  }
}

/**
 * These routes are imported from the `./client/generated/api.ts` file (which might
 * have another name if you set the `clientOutFile` option).
 *
 * ```ts
 * import * as api from './client/generated/api.ts'
 * ```
 */
export type ClientRoutes = Record<string, AnyRoute | Record<string, AnyRoute>>

/**
 * Any valid URI pathname for the given set of client routes.
 */
export type RoutePathname<TRoutes extends ClientRoutes> = //
  [TRoutes] extends [Any]
    ? string
    : {
        [K in keyof TRoutes]: TRoutes[K] extends infer TRoute
          ? TRoute extends Route<infer TPath>
            ? PathTemplate<TPath>
            : TRoute extends Record<string, Route>
              ? RoutePathname<TRoute>
              : never
          : never
      }[keyof TRoutes]

/**
 * The route definition for the given URI pathname and set of client routes.
 */
export type FindRouteForPath<
  TRoutes extends ClientRoutes,
  TPath extends string,
> = {
  [K in keyof TRoutes]: TRoutes[K] extends infer TRoute
    ? TRoute extends Route<infer P>
      ? TPath extends PathTemplate<P>
        ? TRoute
        : never
      : TRoute extends Record<string, Route>
        ? FindRouteForPath<TRoute, TPath>
        : never
    : never
}[keyof TRoutes]

/**
 * The response type for the given URI pathname and set of client routes.
 */
export type FindResponseForPath<
  TRoutes extends ClientRoutes,
  TPath extends string,
> =
  FindRouteForPath<TRoutes, TPath> extends infer TRoute
    ? TRoute extends Route
      ? ReturnType<TRoute['callee']>
      : never
    : never

/**
 * Pagination links (relative to the client prefix URL) are received at the
 * end of a JSON text sequence for routes that use the `paginate` utility
 * of alien-rpc. These links are used by the `previousPage` and `nextPage`
 * methods of the returned async generator.
 *
 * Note that page requests are sent to `GET` routes.
 */
export type RoutePagination = {
  $prev: string | null
  $next: string | null
}

export type { InferParams, PathTemplate } from 'pathic'

export interface ResolvedClientOptions<TErrorMode extends ErrorMode = ErrorMode>
  extends ClientOptions<TErrorMode> {
  errorMode: TErrorMode
}

// Allow undefined header values.
export type HeadersInit =
  | globalThis.HeadersInit
  | Record<string, string | undefined>

export interface RequestOptions
  extends Omit<RequestInit, 'method' | 'body' | 'headers'> {
  /**
   * A `Headers` object, an object literal, or an array of two-item arrays
   * to set request's headers.
   */
  headers?: HeadersInit | undefined

  /**
   * An object representing `limit`, `methods`, `statusCodes`,
   * `afterStatusCodes`, and `maxRetryAfter` fields for maximum retry
   * count, allowed methods, allowed status codes, status codes allowed to
   * use the [`Retry-After`][1] time, and maximum [`Retry-After`][1] time.
   *
   * If `retry` is a number, it will be used as `limit` and other defaults
   * will remain in place.
   *
   * If the response provides an HTTP status contained in
   * `afterStatusCodes`, Ky will wait until the date or timeout given in
   * the [`Retry-After`][1] header has passed to retry the request. If
   * `Retry-After` is missing, the non-standard [`RateLimit-Reset`][2]
   * header is used in its place as a fallback. If the provided status code
   * is not in the list, the [`Retry-After`][1] header will be ignored.
   *
   * If [`Retry-After`][1] header is greater than `maxRetryAfter`, it will
   * cancel the request.
   *
   * Retries are not triggered following a timeout.
   *
   * [1]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
   * [2]: https://www.ietf.org/archive/id/draft-polli-ratelimit-headers-02.html#section-3.3
   */
  retry?: RetryOptions | number | undefined
}

export interface ClientOptions<TErrorMode extends ErrorMode = ErrorMode>
  extends RequestOptions {
  /**
   * The base URL for the client.
   *
   * @default location.origin
   */
  prefixUrl?: string | URL
  /**
   * Override the `globalThis.fetch` function that sends requests. Useful
   * for testing purposes, mostly.
   */
  fetch?: (request: Request) => Promise<Response>
  /**
   * Control how errors are handled.
   *
   * - `return`: Return a tuple of `[error, undefined]`.
   * - `reject`: Reject the promise with the error.
   *
   * @default 'reject'
   */
  errorMode?: TErrorMode | undefined
  /**
   * The WebSocket connection idle timeout.
   *
   * @default 10_000 (10 seconds)
   */
  wsIdleTimeout?: number | undefined
}

export type RequestParams<
  TPathParams extends object,
  TSearchParams extends object,
> =
  | MergeParams<TPathParams, TSearchParams>
  | (HasNoRequiredKeys<TSearchParams> extends true
      ? HasSingleKey<TPathParams> extends true
        ? Exclude<
            ExcludeObject<TPathParams[keyof TPathParams]>,
            null | undefined
          >
        : never
      : never)

type HasNoRequiredKeys<T extends object> = object extends T
  ? true
  : Record<string, never> extends T
    ? true
    : false

/**
 * Exclude object types from the type, except for arrays.
 */
type ExcludeObject<T> = T extends object
  ? T extends readonly any[]
    ? T
    : never
  : T

/**
 * Merge two object types, with handling of `Record<string, never>` being
 * used to represent an empty object.
 */
type MergeParams<TLeft extends object, TRight extends object> =
  TLeft extends Record<string, never>
    ? TRight
    : TRight extends Record<string, never>
      ? TLeft
      : TLeft & TRight

/**
 * Return true if type `T` has a single property.
 */
type HasSingleKey<T extends object> = keyof T extends infer TKey
  ? TKey extends any
    ? keyof T extends TKey
      ? true
      : false
    : never
  : never

export interface ResponseStream<T> extends AsyncIterableIterator<T> {
  toArray(): Promise<T[]>
  /**
   * Fetch the next page of results. Exists only if there is a next page and
   * after the current stream has been fully consumed.
   */
  nextPage?: (options?: RequestOptions) => ResponseStream<T>
  /**
   * Fetch the previous page of results. Exists only if there is a previous page
   * and after the current stream has been fully consumed.
   */
  previousPage?: (options?: RequestOptions) => ResponseStream<T>
}

export interface RouteResultCache {
  has: (path: string) => boolean
  get: (path: string) => unknown | undefined
  set: (path: string, response: unknown) => void
  delete: (path: string) => void
}

export type ErrorMode = 'return' | 'reject'

export type PathsProxy<API extends ClientRoutes> = {
  readonly [TKey in keyof API]: API[TKey] extends Route
    ? PathBuilderForRoute<API[TKey]>
    : API[TKey] extends Record<string, Route>
      ? PathsProxy<API[TKey]>
      : never
}

/**
 * Produces either a fixed URL or, for dynamic paths, a function that
 * converts a parameters object into a URL.
 */
type PathBuilderForRoute<TRoute extends Route> =
  InferParams<TRoute['path']> extends infer TParams
    ? Record<string, never> extends TParams
      ? string
      : (params: TParams) => string
    : never

export type RouteFunctions<
  API extends ClientRoutes,
  TErrorMode extends ErrorMode,
> = [API] extends [Any]
  ? unknown
  : {
      [K in keyof API]: API[K] extends infer TRoute
        ? TRoute extends Record<string, AnyRoute>
          ? RouteFunctions<TRoute, TErrorMode>
          : RouteFunction<TRoute, TErrorMode>
        : never
    }

type RouteFunction<TRoute, TErrorMode extends ErrorMode> =
  TRoute extends Route<string, (...args: infer TArgs) => infer TResult>
    ? (
        ...args: TArgs
      ) => TResult extends ResponseStream<any>
        ? TResult
        : TErrorMode extends 'return'
          ? Promise<[Error, undefined] | [undefined, Awaited<TResult>]>
          : TResult
    : TRoute extends ws.Route<(...args: infer TArgs) => infer TResult>
      ? (
          ...args: TArgs
        ) => TRoute['pattern'] extends 'r'
          ? TErrorMode extends 'return'
            ? Promise<[Error, undefined] | [undefined, Awaited<TResult>]>
            : TResult
          : TResult
      : never
