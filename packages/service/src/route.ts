import type { RouteMethod } from '@alien-rpc/route'
import {
  type ApplyMiddleware,
  chain,
  type ExtractMiddleware,
  type Middleware,
  type MiddlewareChain,
  type MiddlewareContext,
} from 'alien-middleware'
import type { InferParamsArray } from 'pathic'
import type {
  ClientResult,
  FixedRouteHandler,
  MultiParamRouteHandler,
  MultiParamRoutePath,
  PathParam,
  RouteDefinition,
  RouteResult,
  SingleParamRouteHandler,
  SingleParamRoutePath,
} from './types.js'
import type { ws } from './websocket.js'

/**
 * The default route factory.
 */
export const route = create()

function defineRoute(path: string, middleware?: MiddlewareChain): RouteBuilder {
  return new Proxy({} as RouteBuilder, {
    get(_, key: string) {
      const method = key.toUpperCase() as RouteMethod
      return (handler: any): RouteDefinition => ({
        method,
        path,
        handler,
        middleware,
      })
    },
  })
}

function defineWebSocketRoute(
  handler: (...args: any[]) => any
): ws.RouteDefinition {
  return { protocol: 'ws', handler }
}

function create<T extends MiddlewareChain = never>(
  middlewares?: T
): RouteFactory<T> {
  function route(path: string, middleware?: Middleware) {
    return defineRoute(
      path,
      middleware
        ? (middlewares?.use(middleware) ?? chain(middleware))
        : middlewares
    )
  }

  route.ws = (handler: (...args: any[]) => ws.RouteResult) => {
    return defineWebSocketRoute(handler) as any
  }

  route.use = (middleware: Middleware) => {
    return create(middlewares?.use(middleware) ?? chain(middleware))
  }

  return route as any
}

export type RouteContext<T extends RouteFactory<any>> =
  T extends RouteFactory<infer TMiddleware>
    ? MiddlewareContext<TMiddleware>
    : never

export interface RouteFactory<T extends MiddlewareChain> {
  /**
   * Define a new HTTP route, optionally with a set of middlewares.
   */
  <TPath extends string>(path: TPath): RouteBuilder<TPath, T>
  <TPath extends string, TMiddleware extends ExtractMiddleware<T>>(
    path: TPath,
    middleware: TMiddleware
  ): RouteBuilder<TPath, ApplyMiddleware<T, TMiddleware>>

  /**
   * Define a websocket route powered by [crossws].
   *
   * All websocket routes are funneled through the same websocket connection.
   * Clients connect through the `/ws` endpoint.
   *
   * [crossws]: https://crossws.unjs.io/
   */
  ws: <
    TArgs extends [...any[], ws.RequestContext<T>] = [ws.RequestContext<T>],
    const TResult extends ws.RouteResult = any,
  >(
    handler: (...args: TArgs) => TResult
  ) => {
    protocol: 'ws'
    handler: (...args: TArgs) => TResult
    /** @internal */
    __clientResult: ClientResult<TResult>
  }

  /**
   * Use a set of middlewares for all routes defined with the returned
   * factory function.
   */
  use: <TMiddleware extends ExtractMiddleware<T>>(
    middleware: TMiddleware
  ) => RouteFactory<ApplyMiddleware<T, TMiddleware>>
}

type MultiParamRouteBuilder<
  TPath extends MultiParamRoutePath,
  TMethod extends RouteMethod,
  TMiddleware extends MiddlewareChain,
> = <
  TPathParams extends InferParamsArray<TPath, PathParam> = InferParamsArray<
    TPath,
    string
  >,
  TData extends object = Record<string, never>,
  const TResult extends RouteResult = any,
>(
  handler: MultiParamRouteHandler<
    TPath,
    TPathParams,
    TData,
    MiddlewareContext<TMiddleware>,
    TResult
  >
) => {
  method: TMethod
  path: TPath
  handler: typeof handler
  middleware?: TMiddleware
  /** @internal */
  __clientResult: ClientResult<TResult>
}

type SingleParamRouteBuilder<
  TPath extends SingleParamRoutePath,
  TMethod extends RouteMethod,
  TMiddleware extends MiddlewareChain,
> = <
  TPathParam extends PathParam = string,
  TData extends object = Record<string, never>,
  const TResult extends RouteResult = any,
>(
  handler: SingleParamRouteHandler<
    TPath,
    TPathParam,
    TData,
    MiddlewareContext<TMiddleware>,
    TResult
  >
) => {
  method: TMethod
  path: TPath
  handler: typeof handler
  middleware?: TMiddleware
  /** @internal */
  __clientResult: ClientResult<TResult>
}

type FixedRouteBuilder<
  TPath extends string,
  TMethod extends RouteMethod,
  TMiddleware extends MiddlewareChain,
> = <
  TData extends object = Record<string, never>,
  const TResult extends RouteResult = any,
>(
  handler: FixedRouteHandler<
    TPath,
    TData,
    MiddlewareContext<TMiddleware>,
    TResult
  >
) => {
  method: TMethod
  path: TPath
  handler: typeof handler
  middleware?: TMiddleware
  /** @internal */
  __clientResult: ClientResult<TResult>
}

export type RouteBuilder<
  TPath extends string = any,
  TMiddleware extends MiddlewareChain = any,
> = {
  [TMethod in
    | RouteMethod
    | Lowercase<RouteMethod>]: TPath extends MultiParamRoutePath
    ? MultiParamRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
    : TPath extends SingleParamRoutePath
      ? SingleParamRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
      : FixedRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
}
