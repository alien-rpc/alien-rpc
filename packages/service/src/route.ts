import { RouteMethod } from '@alien-rpc/route'
import { InferParamsArray } from 'pathic'
import {
  FixedRouteHandler,
  MultiParamRouteHandler,
  MultiParamRoutePath,
  PathParam,
  RouteDefinition,
  RouteResult,
  SingleParamRouteHandler,
  SingleParamRoutePath,
} from './types'

export function route<TPath extends string>(path: TPath): RouteFactory<TPath> {
  return new Proxy(globalThis as any, {
    get(_, method: string) {
      method = method.toUpperCase() as RouteMethod
      return (handler: any) => ({ method, path, handler })
    },
  })
}

type Mutable<T> = T extends object
  ? T extends Promise<infer TAwaited>
    ? Promise<Mutable<TAwaited>>
    : T extends ReadonlyArray<infer TElement>
      ? Mutable<TElement>[]
      : { -readonly [K in keyof T]: Mutable<T[K]> }
  : T

export type RouteFactory<TPath extends string> = {
  [TMethod in
    | RouteMethod
    | Lowercase<RouteMethod>]: TPath extends MultiParamRoutePath
    ? <
        TPathParams extends InferParamsArray<
          TPath,
          PathParam
        > = InferParamsArray<TPath, string>,
        TData extends object = any,
        TPlatform = unknown,
        const TResult extends RouteResult = any,
      >(
        handler: MultiParamRouteHandler<
          TPath,
          TPathParams,
          TData,
          TPlatform,
          TResult
        >
      ) => RouteDefinition<
        TPath,
        Parameters<
          MultiParamRouteHandler<TPath, TPathParams, TData, TPlatform, TResult>
        >,
        Mutable<TResult>,
        Uppercase<TMethod>
      >
    : TPath extends SingleParamRoutePath
      ? <
          TPathParam extends PathParam = string,
          TData extends object = any,
          TPlatform = unknown,
          const TResult extends RouteResult = any,
        >(
          handler: SingleParamRouteHandler<
            TPath,
            TPathParam,
            TData,
            TPlatform,
            TResult
          >
        ) => RouteDefinition<
          TPath,
          Parameters<
            SingleParamRouteHandler<
              TPath,
              TPathParam,
              TData,
              TPlatform,
              TResult
            >
          >,
          Mutable<TResult>,
          Uppercase<TMethod>
        >
      : <
          TData extends object = any,
          TPlatform = unknown,
          const TResult extends RouteResult = any,
        >(
          handler: FixedRouteHandler<TPath, TData, TPlatform, TResult>
        ) => RouteDefinition<
          TPath,
          Parameters<FixedRouteHandler<TPath, TData, TPlatform, TResult>>,
          Mutable<TResult>,
          Uppercase<TMethod>
        >
}
