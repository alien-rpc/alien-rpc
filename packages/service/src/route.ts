import type { RouteMethod } from '@alien-rpc/route'
import {
  AnyMiddleware,
  AnyMiddlewareChain,
  type ApplyMiddleware,
  ApplyMiddlewares,
  chain,
  type ExtractMiddleware,
  type Middleware,
  MiddlewareChain,
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

function defineRoute(path: string, middleware?: AnyMiddleware): RouteBuilder {
  return new Proxy({} as RouteBuilder, {
    get(_, key: string) {
      const method = key.toUpperCase() as RouteMethod
      return (handler: any): RouteDefinition => ({
        method,
        path,
        handler,
        middleware: middleware ? chain(middleware as Middleware) : null,
      })
    },
  })
}

function defineWebSocketRoute(
  handler: (...args: any[]) => any
): ws.RouteDefinition {
  return { protocol: 'ws', handler }
}

function create<T extends AnyMiddleware = never>(middlewares: T | null = null) {
  type TMiddleware = MiddlewareChain<ApplyMiddlewares<[T]>>

  function route(path: string, middleware: AnyMiddleware | null = null) {
    return defineRoute(
      path,
      chain(middlewares as Middleware | null).use(
        middleware as Middleware | null
      )
    )
  }

  route.ws = (handler: (...args: any[]) => ws.RouteResult) => {
    return defineWebSocketRoute(handler) as any
  }

  route.use = (middleware: AnyMiddleware) => {
    return create(
      chain(middlewares as Middleware | null).use(middleware as Middleware)
    )
  }

  return route as unknown as RouteFactory<TMiddleware>
}

export type RouteContext<T extends RouteFactory<any>> =
  T extends RouteFactory<infer TMiddleware>
    ? MiddlewareContext<[TMiddleware]>
    : never

export interface RouteFactory<T extends AnyMiddlewareChain> {
  /**
   * Define a new HTTP route, optionally with a set of middlewares.
   */
  <TPath extends string>(path: TPath): RouteBuilder<TPath, T>
  <TPath extends string, TMiddleware extends ExtractMiddleware<T>>(
    path: TPath,
    middleware: TMiddleware
  ): RouteBuilder<TPath, Extract<ApplyMiddleware<T, TMiddleware>, Middleware>>

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
  ) => RouteFactory<MiddlewareChain<ApplyMiddleware<T, TMiddleware>>>
}

type MultiParamRouteBuilder<
  TPath extends MultiParamRoutePath,
  TMethod extends RouteMethod,
  TMiddleware extends AnyMiddleware,
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
    MiddlewareContext<[TMiddleware]>,
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
  TMiddleware extends AnyMiddleware,
> = <
  TPathParam extends PathParam = string,
  TData extends object = Record<string, never>,
  const TResult extends RouteResult = any,
>(
  handler: SingleParamRouteHandler<
    TPath,
    TPathParam,
    TData,
    MiddlewareContext<[TMiddleware]>,
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
  TMiddleware extends AnyMiddleware,
> = <
  TData extends object = Record<string, never>,
  const TResult extends RouteResult = any,
>(
  handler: FixedRouteHandler<
    TPath,
    TData,
    MiddlewareContext<[TMiddleware]>,
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
  TMiddleware extends AnyMiddleware = any,
> = {
  [TMethod in
    | RouteMethod
    | Lowercase<RouteMethod>]: TPath extends MultiParamRoutePath
    ? MultiParamRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
    : TPath extends SingleParamRoutePath
      ? SingleParamRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
      : FixedRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
}
