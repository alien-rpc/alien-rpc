import type { RouteMethod } from '@alien-rpc/route'
import type { RequestHandlerStack } from '@hattip/compose'
import type { InferParamsArray } from 'pathic'
import {
  ClientResult,
  FixedRouteHandler,
  MultiParamRouteHandler,
  MultiParamRoutePath,
  PathParam,
  RouteDefinition,
  RouteResult,
  SingleParamRouteHandler,
  SingleParamRoutePath,
} from './types'
import { ws } from './websocket'

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

/**
 * Define a websocket route powered by [crossws].
 *
 * All websocket routes are funneled through the same websocket connection.
 * Clients connect through the `/ws` endpoint.
 *
 * [crossws]: https://crossws.unjs.io/
 */
route.ws = <
  TParams extends any[],
  TPlatform,
  const TResult extends ws.RouteResult,
>(
  handler: (...args: [...TParams, ws.RequestContext<TPlatform>]) => TResult
): ws.RouteHandler<TParams, TPlatform, TResult> => handler as any

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
