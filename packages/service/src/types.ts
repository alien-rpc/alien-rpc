import type { RouteMethod, RouteResultFormat } from '@alien-rpc/route'
import type { TSchema } from '@sinclair/typebox'
import { MiddlewareChain, RequestContext } from 'alien-middleware'
import type { InferParamNames, InferParamsArray } from 'pathic'
import type { Promisable } from './internal/types.js'
import type { JSON, JSONCodable, JSONObjectCodable } from './json/types.js'
import type { PaginationLinks } from './pagination.js'
import type { ws } from './websocket.js'

export type RouteIterator<TYield extends JSONCodable = JSONCodable> =
  AsyncIterator<TYield, PaginationLinks | void | null, any>

export type RouteResult = Promisable<
  JSONCodable | AnyResponse | RouteIterator | void
>

export type RouteHandler =
  | FixedRouteHandler<any>
  | SingleParamRouteHandler<any>
  | MultiParamRouteHandler<any>

export type FixedRouteHandler<
  TPath extends string,
  TData extends object = any,
  TContext extends RequestContext = any,
  TResult extends RouteResult = any,
> = (
  this: RouteDefinition<TPath, [TData]>,
  data: TData,
  ctx: TContext
) => TResult

export type SingleParamRoutePath = `${string}/${':' | '*'}${string}`

export type SingleParamRouteHandler<
  TPath extends SingleParamRoutePath,
  TPathParam extends PathParam = any,
  TData extends object = any,
  TContext extends RequestContext = any,
  TResult extends RouteResult = any,
> = (
  this: NoInfer<RouteDefinition<TPath, [TPathParam, TData]>>,
  pathParam: TPathParam,
  data: TData,
  ctx: TContext
) => TResult

export type MultiParamRoutePath =
  `${string}/${':' | '*'}${string}/${':' | '*'}${string}`

export type MultiParamRouteHandler<
  TPath extends MultiParamRoutePath,
  TPathParams extends InferParamsArray<TPath, PathParam> = any,
  TData extends object = any,
  TContext extends RequestContext = any,
  TResult extends RouteResult = any,
> = (
  this: NoInfer<RouteDefinition<TPath, [TPathParams, TData]>>,
  pathParams: TPathParams,
  data: TData,
  ctx: TContext
) => TResult

export interface RouteDefinition<
  TPath extends string = string,
  TArgs extends any[] = any[],
  TResult extends RouteResult = any,
  TMethod extends RouteMethod = RouteMethod,
> {
  method: TMethod
  path: TPath
  handler: (...args: TArgs) => TResult
  middleware?: MiddlewareChain
}

/**
 * The route list exported by the generated `serverOutFile`.
 */
export type RouteList = readonly (Route | ws.Route)[]

/**
 * A route definition enhanced with compile-time metadata.
 */
export interface Route {
  method: RouteMethod
  path: string
  name: string
  import: () => Promise<any>
  pathParams?: readonly string[]
  format: RouteResultFormat
  pathSchema?: TSchema
  requestSchema?: TSchema
}

export type PathParams = { [key: string]: PathParam }
export type PathParam = string | number | (string | number)[]

export type PathParamsArray<
  TPath extends string = string,
  TValue extends PathParam = PathParam,
> = string extends TPath
  ? readonly TValue[]
  : InferParamNames<TPath> extends infer TNameArray extends readonly string[]
    ? { [Index in keyof TNameArray]: TValue }
    : never

/**
 * Create an object type from a path pattern and a tuple of parameter
 * values.
 */
export type BuildPathParams<
  TPath extends string,
  TParams extends PathParamsArray,
> = Objectify<InferParamNames<TPath>, TParams>

// Credit to @jcalz (as always): https://stackoverflow.com/a/58939723/2228559
type Objectify<K extends readonly PropertyKey[], V extends readonly any[]> = {
  [T in ZipTuple<K, V>[number] as T[0]]: T[1]
}

type ZipTuple<T extends readonly any[], U extends readonly any[]> = {
  [K in keyof T]: [T[K], K extends keyof U ? U[K] : U[number]]
}

export type BuildRouteParams<
  TPathParams extends PathParams,
  TData extends object,
> =
  TPathParams extends Record<string, never>
    ? TData extends Record<string, never>
      ? Record<string, never>
      : TData
    : TData extends Record<string, never>
      ? TPathParams
      : TPathParams & TData

export type InferRouteParams<TDefinition extends RouteDefinition> =
  TDefinition extends RouteDefinition<infer TPath, infer TArgs>
    ? TPath extends MultiParamRoutePath
      ? BuildRouteParams<BuildPathParams<TPath, TArgs[0]>, TArgs[1]>
      : TPath extends SingleParamRoutePath
        ? BuildRouteParams<BuildPathParams<TPath, [TArgs[0]]>, TArgs[1]>
        : BuildRouteParams<Record<string, never>, TArgs[0]>
    : never

/**
 * A “route responder” is responsible for invoking a route handler and
 * coercing its result into a Response object.
 */
export type RouteResponder = (
  route: RouteDefinition,
  args: Parameters<RouteHandler>,
  ctx: RequestContext
) => Promisable<Response>

/**
 * Both the Node.js and Cloudflare workers environments have a `Response`
 * type that *should* be assignable to this interface.
 */
export interface AnyResponse {
  readonly headers: object
  readonly ok: boolean
  readonly status: number
  readonly statusText: string
  readonly url: string
  readonly arrayBuffer: () => Promise<ArrayBuffer>
  readonly blob: () => Promise<object>
  readonly formData: () => Promise<object>
  readonly json: () => Promise<unknown>
  readonly text: () => Promise<string>
}

type ToJSONStrict<T> = T extends object
  ? T extends ReadonlyArray<infer TElement>
    ? Array<TElement> extends T
      ? ToJSON<TElement>[]
      : { -readonly [K in keyof T]: ToJSON<T[K]> }
    : T extends JSONObjectCodable
      ? { -readonly [K in keyof T]: ToJSON<T[K]> }
      : T extends BigInt
        ? never
        : {}
  : Extract<T, JSON | undefined>

type ToJSON<T> = T extends { toJSON(): infer TData }
  ? ToJSONStrict<TData>
  : ToJSONStrict<T>

/**
 * Given a route handler's return type, receive a client-compatible type.
 * This won't be the exact type the client sees, as `@alien-rpc/generator`
 * does a bit of work after this is used.
 *
 * Importantly, we never want a `Promise` type back.
 */
export type ClientResult<T> =
  T extends Promise<infer TAwaited>
    ? ClientResult<TAwaited>
    : T extends AnyResponse
      ? T
      : T extends AsyncIterable<infer TValue>
        ? AsyncIterable<ToJSON<TValue>>
        : ToJSON<T>
