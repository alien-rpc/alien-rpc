import type { RouteMethod } from '@alien-rpc/route'
import type { RequestHandlerStack } from '@hattip/compose'
import type { InferParamsArray } from 'pathic'
import {
  AnyResponse,
  FixedRouteHandler,
  MultiParamRouteHandler,
  MultiParamRoutePath,
  PathParam,
  RouteDefinition,
  RouteIterator,
  RouteResult,
  SingleParamRouteHandler,
  SingleParamRoutePath,
} from './types'

/**
 * Define a new route, optionally with a set of middlewares.
 */
export function route<TPath extends string, TPlatform = unknown>(
  path: TPath,
  middlewares?: RequestHandlerStack<TPlatform>[]
): RouteFactory<TPath, TPlatform> {
  return new Proxy(globalThis as any, {
    get(_, method: string) {
      method = method.toUpperCase() as RouteMethod
      return (handler: any) => ({ method, path, handler, middlewares })
    },
  })
}

/**
 * Use a set of middlewares for all routes defined with the returned
 * factory function.
 */
route.use = <TPlatform = unknown>(
  sharedMiddlewares: RequestHandlerStack<TPlatform>[]
) => {
  return <TPath extends string>(
    path: TPath,
    middlewares?: RequestHandlerStack<TPlatform>[]
  ): RouteFactory<TPath, TPlatform> =>
    route(
      path,
      middlewares ? [...sharedMiddlewares, ...middlewares] : sharedMiddlewares
    )
}

type ToJSON<T> = T extends { toJSON(): infer TData }
  ? TData
  : T extends object
    ? T extends ReadonlyArray<infer TElement>
      ? Array<TElement> extends T
        ? ToJSON<TElement>[]
        : { -readonly [K in keyof T]: ToJSON<T[K]> }
      : { -readonly [K in keyof T]: ToJSON<T[K]> }
    : T

type ClientResult<T> = T extends AnyResponse
  ? T
  : T extends RouteIterator<infer TValue>
    ? RouteIterator<ToJSON<TValue>>
    : T extends Promise<infer TValue>
      ? Promise<ToJSON<TValue>>
      : ToJSON<T>

type MultiParamRouteFactory<
  TPath extends MultiParamRoutePath,
  TMethod extends RouteMethod,
  TDefaultPlatform = unknown,
> = <
  TPathParams extends InferParamsArray<TPath, PathParam> = InferParamsArray<
    TPath,
    string
  >,
  TData extends object = any,
  TPlatform = TDefaultPlatform,
  const TResult extends RouteResult = any,
>(
  handler: MultiParamRouteHandler<TPath, TPathParams, TData, TPlatform, TResult>
) => RouteDefinition<
  TPath,
  Parameters<MultiParamRouteHandler<TPath, TPathParams, TData, TPlatform, any>>,
  ClientResult<TResult>,
  TMethod
>

type SingleParamRouteFactory<
  TPath extends SingleParamRoutePath,
  TMethod extends RouteMethod,
  TDefaultPlatform = unknown,
> = <
  TPathParam extends PathParam = string,
  TData extends object = any,
  TPlatform = TDefaultPlatform,
  const TResult extends RouteResult = any,
>(
  handler: SingleParamRouteHandler<TPath, TPathParam, TData, TPlatform, TResult>
) => RouteDefinition<
  TPath,
  Parameters<SingleParamRouteHandler<TPath, TPathParam, TData, TPlatform, any>>,
  ClientResult<TResult>,
  TMethod
>

type FixedRouteFactory<
  TPath extends string,
  TMethod extends RouteMethod,
  TDefaultPlatform = unknown,
> = <
  TData extends object = any,
  TPlatform = TDefaultPlatform,
  const TResult extends RouteResult = any,
>(
  handler: FixedRouteHandler<TPath, TData, TPlatform, TResult>
) => RouteDefinition<
  TPath,
  Parameters<FixedRouteHandler<TPath, TData, TPlatform, any>>,
  ClientResult<TResult>,
  TMethod
>

export type RouteFactory<TPath extends string, TPlatform = unknown> = {
  [TMethod in
    | RouteMethod
    | Lowercase<RouteMethod>]: TPath extends MultiParamRoutePath
    ? MultiParamRouteFactory<TPath, Uppercase<TMethod>, TPlatform>
    : TPath extends SingleParamRoutePath
      ? SingleParamRouteFactory<TPath, Uppercase<TMethod>, TPlatform>
      : FixedRouteFactory<TPath, Uppercase<TMethod>, TPlatform>
}
