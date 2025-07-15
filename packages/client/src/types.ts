import type { RouteMethod } from '@alien-rpc/route'
import type { Any, Simplify } from 'radashi'
import type { Client } from './client.js'
import type { HTTPError } from './error.js'
import type { RetryOptions } from './utils/retry.js'

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

export type ResponseFormat<TResult = unknown> = {
  name: string
  parse: ResponseParser<TResult>
}

export type AnyRoute = Route | ws.Route

type AnyFn = (...args: any) => any

export type Route<T extends AnyFn = AnyFn> = {
  method: RouteMethod
  path: string
  pathParams?: string[]
  /**
   * The result format determines how the response must be handled for the
   * caller to receive the expected type.
   */
  format: 'json' | 'response' | ResponseFormat<Awaited<ReturnType<T>>>
  /**
   * Equals 1 if the route has no search parameters or request body.
   */
  arity: 1 | 2
  /**
   * Type information for the route. Doesn't exist at runtime.
   */
  __type: T
}

export declare namespace Route {
  /**
   * Shorthand for a route with no path parameters or search parameters.
   */
  export type withNoParams = Route<
    (pathParams: unknown, searchParams: unknown, body: any) => any
  >

  /**
   * Shorthand for a route with optional path parameters and search
   * parameters.
   */
  export type withOptionalParams = Route<
    (pathParams: {}, searchParams: {}, body: any) => any
  >

  /**
   * Infer the path parameters and search parameters from a route definition.
   *
   * Notably, this excludes the request body.
   */
  export type inferParams<TRoute> =
    TRoute extends Route<
      (
        pathParams: infer TPathParams,
        searchParams: infer TSearchParams,
        body: any
      ) => any
    >
      ? MergeParams<Objectify<TPathParams>, Objectify<TSearchParams>>
      : never

  /**
   * Infer the result type from a route definition.
   */
  export type inferResult<TRoute> =
    TRoute extends Route<infer TSignature> ? ReturnType<TSignature> : never
}

export type RouteProtocol<TRoute> = {
  name: string
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

  export type RouteFunction<TRoute, TErrorMode extends ErrorMode> =
    TRoute extends ws.Route<(...args: infer TArgs) => infer TResult>
      ? (
          ...args: TArgs
        ) => TRoute['pattern'] extends 'r'
          ? TErrorMode extends 'return'
            ? Promise<[Error, undefined] | [undefined, Awaited<TResult>]>
            : TResult
          : TResult
      : never

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
  headers: Headers
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
   * `afterStatusCodes`, the client will wait until the date or timeout
   * given in the [`Retry-After`][1] header has passed to retry the
   * request. If `Retry-After` is missing, the non-standard
   * [`RateLimit-Reset`][2] header is used in its place as a fallback. If
   * the provided status code is not in the list, the [`Retry-After`][1]
   * header will be ignored.
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

  /**
   * The request timeout (in seconds). If response headers are not received
   * within this time, the request will be aborted. Each retry has its own
   * timeout. Set to `0` to disable timeouts. Can not be greater than
   * `2147483647`.
   *
   * The timeout error is a `DOMException` with the name `"TimeoutError"`.
   *
   * @default 60
   */
  timeout?: number | undefined
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
   * Called with the response and its request.
   */
  hooks?: RequestHooks | readonly RequestHooks[] | undefined
  /**
   * The WebSocket connection ping interval (in seconds). Pings are only
   * sent if enough time has passed between messages, either sent or
   * received.
   *
   * Disabled when equal to `0` or less.
   *
   * @default 20
   */
  wsPingInterval?: number | undefined
  /**
   * The WebSocket connection pong timeout (in seconds). If a pong is not
   * received within this time, the connection will be closed.
   *
   * @default 20
   */
  wsPongTimeout?: number | undefined
  /**
   * The WebSocket connection idle timeout (in seconds).
   *
   * Disabled by default and when equal to `0` or less.
   *
   * @default 0 (disabled)
   */
  wsIdleTimeout?: number | undefined
}

type Promisable<T> = T | Promise<T>

export type BeforeErrorHook = (error: HTTPError) => Promisable<HTTPError>

export type AfterResponseHook = (args: {
  request: Request
  response: Response
}) => Promisable<Response | void>

export type RequestHooks = {
  /**
   * Called before a `HTTPError` is thrown. You can modify the error or
   * return a new error.
   */
  beforeError?: BeforeErrorHook | readonly BeforeErrorHook[] | undefined
  /**
   * Called after a response is received. You can modify the response or
   * return a new response. This runs before `beforeError` hooks.
   */
  afterResponse?: AfterResponseHook | readonly AfterResponseHook[] | undefined
}

export type RequestHookByName = {
  beforeError: BeforeErrorHook
  afterResponse: AfterResponseHook
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
 * Coerce `never` to `U`.
 */
type CoerceNever<T, U> = [T] extends [never] ? U : T

/**
 * Coerce `never` and `unknown` types to `Record<string, never>`.
 */
type Objectify<T> = CoerceNever<Extract<T, object>, Record<string, never>>

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

export type ResponseStreamDirective = RoutePagination | { $error: object }

export interface RouteResultCache {
  has: (path: string) => boolean
  get: (path: string) => unknown | undefined
  set: (path: string, response: unknown) => void
  delete: (path: string) => void
}

export type ErrorMode = 'return' | 'reject'

export type RouteFunctions<
  API extends ClientRoutes,
  TErrorMode extends ErrorMode,
> = [API] extends [Any]
  ? unknown
  : {
      [K in keyof API]: API[K] extends infer TRoute
        ? TRoute extends Record<string, AnyRoute>
          ? RouteFunctions<TRoute, TErrorMode>
          : TRoute extends Route
            ? RouteFunction<TRoute, TErrorMode>
            : ws.RouteFunction<TRoute, TErrorMode>
        : never
    }

export type RouteTypeInfo<TRoute> = {
  /** Type information for the route. Doesn't exist at runtime. */
  __route: TRoute
}

type RouteFunction<TRoute, TErrorMode extends ErrorMode> =
  TRoute extends Route<
    (
      pathParams: infer TPathParams,
      searchParams: infer TSearchParams,
      body: infer TBody
    ) => infer TResult
  >
    ? RequestParams<
        Objectify<TPathParams>,
        [TBody] extends [object]
          ? Objectify<TBody extends Blob ? { body: TBody } : TBody>
          : Objectify<TSearchParams>
      > extends infer TParams
      ? ([TParams] extends [Record<string, never>]
          ? (
              requestOptions?: RequestOptions
            ) => RouteFunctionResult<TResult, TErrorMode>
          : Record<string, never> extends TParams
            ? (
                params?: Simplify<TParams>,
                requestOptions?: RequestOptions
              ) => RouteFunctionResult<TResult, TErrorMode>
            : (
                params: Simplify<TParams>,
                requestOptions?: RequestOptions
              ) => RouteFunctionResult<TResult, TErrorMode>) &
          RouteTypeInfo<TRoute>
      : never
    : never

type RouteFunctionResult<TResult, TErrorMode extends ErrorMode> =
  TResult extends ResponseStream<any>
    ? TResult
    : TErrorMode extends 'return'
      ? Promise<[Error, undefined] | [undefined, Awaited<TResult>]>
      : TResult

export type FetchOptions = RequestOptions & {
  body?: RequestInit['body']
  json?: unknown
  method?: string
  query?: string
}
