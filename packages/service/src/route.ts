import type { RouteMethod } from '@alien-rpc/route'
import type { RequestHandlerStack } from '@hattip/compose'
import type { InferParamsArray } from 'pathic'
import type { InferPlatform, Last } from './internal/types.js'
import type {
  ClientResult,
  FixedRouteHandler,
  MultiParamRouteHandler,
  MultiParamRoutePath,
  PathParam,
  RouteResult,
  SingleParamRouteHandler,
  SingleParamRoutePath,
} from './types.js'
import type { ws } from './websocket.js'

/**
 * The default route factory.
 *
 * ```ts
 * // A simple GET route.
 * export const myFunc = route('/path/to/func').GET(async (ctx) => {
 *   return 'Hello, world!'
 * })
 *
 * // Share middlewares between routes.
 * const myMiddleware: RequestHandler = (ctx) => {
 *   ctx.foo = 'bar'
 *   return ctx.next()
 * }
 *
 * const enhancedRoute = route.use([myMiddleware])
 *
 * export const myEnhancedFunc = enhancedRoute('/path/to/func').GET(async (ctx) => {
 *   return ctx.foo
 * })
 * ```
 */
export const route = create()

function defineRoute(
  path: string,
  middlewares?: RequestHandlerStack<any>[]
): RouteBuilder {
  return new Proxy({} as RouteBuilder, {
    get(_, method: string) {
      method = method.toUpperCase()
      return (handler: any) => ({ method, path, handler, middlewares })
    },
  })
}

function defineWebSocketRoute(
  handler: (...args: any[]) => any
): ws.RouteDefinition {
  return { protocol: 'ws', handler }
}

function create<TPlatform>(
  sharedMiddlewares?: RequestHandlerStack<TPlatform>[]
): RouteFactory<TPlatform> {
  function route(path: string, middlewares?: RequestHandlerStack<any>[]) {
    return defineRoute(path, merge(sharedMiddlewares, middlewares))
  }

  route.ws = (handler: (...args: any[]) => ws.RouteResult) => {
    return defineWebSocketRoute(handler) as any
  }

  route.use = (middlewares: RequestHandlerStack<any>[]) => {
    return create(merge(sharedMiddlewares, middlewares))
  }

  return route
}

function merge<T, U>(left: T[] | undefined, right: U[] | undefined) {
  return left ? (right ? [...left, ...right] : left) : right
}

export interface RouteFactory<P = unknown> {
  /**
   * Define a new HTTP route, optionally with a set of middlewares.
   */
  <TPath extends string, TPlatform extends P>(
    path: TPath,
    middlewares?: RequestHandlerStack<TPlatform>[]
  ): RouteBuilder<TPath, TPlatform>

  /**
   * Define a websocket route powered by [crossws].
   *
   * All websocket routes are funneled through the same websocket connection.
   * Clients connect through the `/ws` endpoint.
   *
   * [crossws]: https://crossws.unjs.io/
   */
  ws: <
    TArgs extends [...any[], ws.RequestContext<P>] = [ws.RequestContext<P>],
    const TResult extends ws.RouteResult = any,
  >(
    handler: (...args: TArgs) => TResult,
    middlewares?: RequestHandlerStack<InferPlatform<Last<TArgs>>>[]
  ) => {
    protocol: 'ws'
    handler: (...args: TArgs) => TResult
    middlewares?: typeof middlewares
    /** @internal */
    __clientResult: ClientResult<TResult>
  }

  /**
   * Use a set of middlewares for all routes defined with the returned
   * factory function.
   */
  use: <TPlatform extends P>(
    sharedMiddlewares: RequestHandlerStack<TPlatform>[]
  ) => RouteFactory<TPlatform>
}

type MultiParamRouteBuilder<
  TPath extends MultiParamRoutePath,
  TMethod extends RouteMethod,
  Platform = unknown,
> = <
  TPathParams extends InferParamsArray<TPath, PathParam> = InferParamsArray<
    TPath,
    string
  >,
  TData extends object = Record<string, never>,
  TPlatform extends Platform = Platform,
  const TResult extends RouteResult = any,
>(
  handler: MultiParamRouteHandler<TPath, TPathParams, TData, TPlatform, TResult>
) => {
  method: TMethod
  path: TPath
  handler: typeof handler
  middlewares?: RequestHandlerStack<Platform>[]
  /** @internal */
  __clientResult: ClientResult<TResult>
}

type SingleParamRouteBuilder<
  TPath extends SingleParamRoutePath,
  TMethod extends RouteMethod,
  Platform = unknown,
> = <
  TPathParam extends PathParam = string,
  TData extends object = Record<string, never>,
  TPlatform extends Platform = Platform,
  const TResult extends RouteResult = any,
>(
  handler: SingleParamRouteHandler<TPath, TPathParam, TData, TPlatform, TResult>
) => {
  method: TMethod
  path: TPath
  handler: typeof handler
  middlewares?: RequestHandlerStack<Platform>[]
  /** @internal */
  __clientResult: ClientResult<TResult>
}

type FixedRouteBuilder<
  TPath extends string,
  TMethod extends RouteMethod,
  Platform = unknown,
> = <
  TData extends object = Record<string, never>,
  TPlatform extends Platform = Platform,
  const TResult extends RouteResult = any,
>(
  handler: FixedRouteHandler<TPath, TData, TPlatform, TResult>
) => {
  method: TMethod
  path: TPath
  handler: typeof handler
  middlewares?: RequestHandlerStack<Platform>[]
  /** @internal */
  __clientResult: ClientResult<TResult>
}

export type RouteBuilder<TPath extends string = any, TPlatform = any> = {
  [TMethod in
    | RouteMethod
    | Lowercase<RouteMethod>]: TPath extends MultiParamRoutePath
    ? MultiParamRouteBuilder<TPath, Uppercase<TMethod>, TPlatform>
    : TPath extends SingleParamRoutePath
      ? SingleParamRouteBuilder<TPath, Uppercase<TMethod>, TPlatform>
      : FixedRouteBuilder<TPath, Uppercase<TMethod>, TPlatform>
}
