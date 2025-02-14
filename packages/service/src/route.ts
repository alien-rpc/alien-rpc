import type { RouteMethod } from '@alien-rpc/route'
import type { InferParamsArray } from 'pathic'
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

type ToJSON<T> = T extends { toJSON(): infer TData }
  ? TData
  : T extends object
    ? T extends ReadonlyArray<infer TElement>
      ? Array<TElement> extends T
        ? ToJSON<TElement>[]
        : { -readonly [K in keyof T]: ToJSON<T[K]> }
      : { -readonly [K in keyof T]: ToJSON<T[K]> }
    : T

type ClientResult<T> = T extends Response
  ? Response
  : T extends AsyncIterator<infer TValue>
    ? AsyncIterator<ToJSON<TValue>>
    : T extends Promise<infer TValue>
      ? Promise<ToJSON<TValue>>
      : ToJSON<T>

type MultiParamRouteFactory<
  TPath extends MultiParamRoutePath,
  TMethod extends RouteMethod,
> = <
  TPathParams extends InferParamsArray<TPath, PathParam> = InferParamsArray<
    TPath,
    string
  >,
  TData extends object = any,
  TPlatform = unknown,
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
> = <
  TPathParam extends PathParam = string,
  TData extends object = any,
  TPlatform = unknown,
  const TResult extends RouteResult = any,
>(
  handler: SingleParamRouteHandler<TPath, TPathParam, TData, TPlatform, TResult>
) => RouteDefinition<
  TPath,
  Parameters<SingleParamRouteHandler<TPath, TPathParam, TData, TPlatform, any>>,
  ClientResult<TResult>,
  TMethod
>

type FixedRouteFactory<TPath extends string, TMethod extends RouteMethod> = <
  TData extends object = any,
  TPlatform = unknown,
  const TResult extends RouteResult = any,
>(
  handler: FixedRouteHandler<TPath, TData, TPlatform, TResult>
) => RouteDefinition<
  TPath,
  Parameters<FixedRouteHandler<TPath, TData, TPlatform, any>>,
  ClientResult<TResult>,
  TMethod
>

export type RouteFactory<TPath extends string> = {
  [TMethod in
    | RouteMethod
    | Lowercase<RouteMethod>]: TPath extends MultiParamRoutePath
    ? MultiParamRouteFactory<TPath, Uppercase<TMethod>>
    : TPath extends SingleParamRoutePath
      ? SingleParamRouteFactory<TPath, Uppercase<TMethod>>
      : FixedRouteFactory<TPath, Uppercase<TMethod>>
}
