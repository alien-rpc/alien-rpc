import { PathTemplate } from '@alloc/path-types'

type AnyFn = (...args: any) => any

export type RpcMethod = 'get' | 'post'

export type RpcResultFormat = 'json' | 'json-seq' | 'response'

export type RpcRoute<
  TPath extends string = string,
  TCallee extends AnyFn = AnyFn,
> = {
  method: RpcMethod
  path: TPath
  /**
   * The result format determines how the response must be handled for the
   * caller to receive the expected type.
   */
  format: RpcResultFormat
  /**
   * Equals 1 if the route has no search parameters or request body.
   */
  arity: 1 | 2
  /**
   * Exists for GET routes and is non-empty for routes with search
   * parameters that may be a string or some other type. This ensures the
   * string values are JSON encoded to ensure parse-ability.
   */
  jsonParams?: string[]
  /**
   * The route's signature type. This property never actually exists at
   * runtime.
   */
  callee: TCallee
}

/**
 * Any valid URI pathname for the given route interface.
 */
export type RpcPathname<TRoutes extends Record<string, RpcRoute>> =
  TRoutes[keyof TRoutes] extends RpcRoute<infer TEndpointPath>
    ? PathTemplate<TEndpointPath>
    : never

/**
 * The response type for the given URI pathname and route interface.
 */
export type RpcResponseByPath<
  TRoutes extends Record<string, RpcRoute>,
  TPath extends string,
> = {
  [K in keyof TRoutes]: TRoutes[K] extends RpcRoute<infer P>
    ? TPath extends PathTemplate<P>
      ? TRoutes[K]
      : never
    : never
}[keyof TRoutes]

/**
 * Pagination links (relative to the client prefix URL) are returned by the
 * server route handler for ndJSON-based routes. These links are used by
 * the `previousPage` and `nextPage` methods of the returned async
 * generator.
 *
 * Note that page requests are sent to `GET` routes.
 */
export type RpcPagination = {
  $prev: string | null
  $next: string | null
}

export type { InferParams, PathTemplate } from '@alloc/path-types'

export type RequestOptions = Omit<
  import('ky').Options,
  'method' | 'body' | 'json' | 'searchParams' | 'prefixUrl'
>

export type RequestParams<
  TPathParams extends object,
  TSearchParams extends object,
> =
  | MergeParams<TPathParams, TSearchParams>
  | (object extends TSearchParams
      ? HasSingleKey<TPathParams> extends true
        ? ExcludeObject<TPathParams[keyof TPathParams]>
        : never
      : never)

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
  /**
   * Fetch the next page of results. Exists only if there is a next page and
   * after the current stream has been fully consumed.
   */
  nextPage?: () => ResponseStream<T>
  /**
   * Fetch the previous page of results. Exists only if there is a previous page
   * and after the current stream has been fully consumed.
   */
  previousPage?: () => ResponseStream<T>
}

export interface ResponseCache {
  get: (path: string) => unknown | undefined
  set: (path: string, response: unknown) => void
}
