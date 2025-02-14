import type { RouteMethod } from '@alien-rpc/route'
import type { InferParams, PathTemplate } from 'pathic'
import type { Any } from 'radashi'
import type { Client } from './client.js'

export type CachedResponseStream<T> =
  | readonly T[]
  | readonly [...T[], RoutePagination]

export type CachedResponse<
  API extends ClientRoutes,
  TPath extends RoutePathname<API>,
> =
  Awaited<FindResponseForPath<API, TPath>> extends infer TResponse
    ? TResponse extends ResponseStream<infer TValue>
      ? CachedResponseStream<TValue>
      : TResponse
    : never

export type ResultFormatter<
  TResult = unknown,
  TCachedResult = Awaited<TResult>,
> = {
  mapCachedResult: (value: TCachedResult, client: Client) => TResult
  /**
   * This must return a promise for `errorMode: 'return'` to work as
   * expected. Notably, the json-seq response parser doesn't return a
   * promise, and so it doesn't respect the `errorMode` setting.
   */
  parseResponse(promisedResponse: Promise<Response>, client: Client): TResult
}

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
  format: string | ResultFormatter<Awaited<ReturnType<TCallee>>, any>
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

/**
 * These routes are imported from the `./client/generated/api.ts` file (which might
 * have another name if you set the `clientOutFile` option).
 *
 * ```ts
 * import * as api from './client/generated/api.ts'
 * ```
 */
export type ClientRoutes = Record<string, Route | Record<string, Route>>

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

export interface ClientOptions<TErrorMode extends ErrorMode = ErrorMode>
  extends Omit<
    import('ky').Options,
    'method' | 'body' | 'json' | 'searchParams' | 'hooks'
  > {
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
   * This cache is checked before sending a `GET` request. It remains empty
   * until you manually call the `Client#setResponse` method.
   *
   * The `ResponseCache` interface is intentionally simplistic to allow use
   * of your own caching algorithm, like one with “least recently used”
   * eviction. Note that `undefined` values are not allowed.
   *
   * @default new Map()
   */
  resultCache?: RouteResultCache | undefined
  /**
   * Hooks allow modifications during the request lifecycle. Hook functions
   * may be async and are run serially. Pass a function to receive the
   * client instance and customize hooks on a per-instance level.
   */
  hooks?: ClientHooks | ((client: Client) => ClientHooks) | undefined
}

export type ClientHooks = import('ky').Hooks

export interface RequestOptions extends Omit<ClientOptions, 'prefixUrl'> {
  hooks?: ClientHooks | undefined
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

export type { ResponsePromise } from 'ky'

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
        ? TRoute extends Route<string, infer TCallee>
          ? (
              ...args: Parameters<TCallee>
            ) => RouteFunctionResult<ReturnType<TCallee>, TErrorMode>
          : TRoute extends Record<string, Route>
            ? RouteFunctions<TRoute, TErrorMode>
            : never
        : never
    }

type RouteFunctionResult<TResult, TErrorMode extends ErrorMode> =
  TResult extends ResponseStream<infer TValue>
    ? ToJSON<TValue>
    : TErrorMode extends 'return'
      ? Promise<[Error, undefined] | [undefined, ToJSON<Awaited<TResult>>]>
      : ToJSON<TResult>

type ToJSON<T> = T extends Response
  ? Response
  : T extends object
    ? T extends { toJSON(): infer TResult }
      ? TResult
      : { [K in keyof T]: ToJSON<T[K]> }
    : T
