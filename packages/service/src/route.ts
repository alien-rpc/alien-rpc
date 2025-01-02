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
        TResult extends RouteResult = any,
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
        TResult,
        Uppercase<TMethod>
      >
    : TPath extends SingleParamRoutePath
      ? <
          TPathParam extends PathParam = string,
          TData extends object = any,
          TPlatform = unknown,
          TResult extends RouteResult = any,
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
          TResult,
          Uppercase<TMethod>
        >
      : <
          TData extends object = any,
          TPlatform = unknown,
          TResult extends RouteResult = any,
        >(
          handler: FixedRouteHandler<TPath, TData, TPlatform, TResult>
        ) => RouteDefinition<
          TPath,
          Parameters<FixedRouteHandler<TPath, TData, TPlatform, TResult>>,
          TResult,
          Uppercase<TMethod>
        >
}
