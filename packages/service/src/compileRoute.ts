import { bodylessMethods } from '@alien-rpc/route'
import {
  RequestContext,
  RequestHandler,
  RequestHandlerStack,
} from '@hattip/compose'
import * as jsonQS from '@json-qs/json-qs'
import { KindGuard, TSchema, Type } from '@sinclair/typebox'
import { TypeCompiler } from '@sinclair/typebox/compiler'
import {
  Decode,
  TransformDecodeCheckError,
  ValueErrorType,
} from '@sinclair/typebox/value'
import { importRoute } from './internal/importRoute.js'
import { supportedResponders } from './responders/index.js'
import { Route, RouteDefinition, RouteHandler } from './types.js'

export type CompiledRoute = ReturnType<typeof compileRoute>

export type CompileRouteOptions = {
  /**
   * Whether to skip TypeBox type compilation.
   */
  noTypeCompiler?: boolean
}

export function compileRoute(route: Route, options: CompileRouteOptions = {}) {
  const decodePathData = compilePathSchema(route, options)
  const decodeRequestData = compileRequestSchema(route, options)
  const responder = supportedResponders[route.format]

  async function getHandlerArgs(
    params: {},
    ctx: RequestContext
  ): Promise<Parameters<RouteHandler>> {
    const data = await decodeRequestData(ctx)

    if (route.pathParams) {
      params = decodePathData(params)

      if (route.pathParams.length > 1) {
        return [Object.values(params), data, ctx]
      }

      return [params[route.pathParams[0] as keyof typeof params], data, ctx]
    }

    return [data, ctx]
  }

  return {
    method: route.method,
    path: route.path,
    name: route.name,
    /**
     * Parse and validate the request, returning an array of arguments to
     * call the route handler with.
     */
    getHandlerArgs,
    /**
     * Invokes the route handler and prepares the HTTP response according
     * to the route's result format. The caller is responsible for decoding
     * the request data beforehand.
     *
     * @param params - The path parameters (possibly empty).
     * @param data - The decoded request data.
     * @param ctx - The route context.
     */
    async responder(args: Parameters<RouteHandler>, ctx: RequestContext) {
      const def = (await importRoute(route)) as RouteDefinition
      if (def.middlewares) {
        return applyMiddlewares(def.middlewares, ctx, () => {
          return responder(def, args, ctx)
        })
      }
      return responder(def, args, ctx)
    },
  }
}

const appliedMiddlewares = new WeakMap<RequestContext, Set<RequestHandler>>()

async function applyMiddlewares(
  stack: RequestHandlerStack[],
  ctx: RequestContext,
  next: () => Promise<Response>
) {
  const applied = appliedMiddlewares.get(ctx) ?? new Set()
  appliedMiddlewares.set(ctx, applied)

  let i = 0
  const outerNext = ctx.next
  const middlewares = stack.flat()

  return (ctx.next = async (): Promise<Response> => {
    while (i < middlewares.length) {
      const middleware = middlewares[i++]
      if (!middleware || applied.has(middleware)) {
        continue
      }
      applied.add(middleware)
      const result = await middleware(ctx)
      if (result instanceof Response) {
        return result
      }
    }
    ctx.next = outerNext
    return next()
  })()
}

function compileSchema<Schema extends TSchema, Output>(
  schema: Schema,
  options: CompileRouteOptions
) {
  if (options.noTypeCompiler) {
    return (input: unknown): Output => Decode(schema, input)
  }
  const compiled = TypeCompiler.Compile(schema)
  return (input: unknown): Output => compiled.Decode(input)
}

function compilePathSchema(
  route: Route,
  options: CompileRouteOptions
): <TParams extends {}>(params: TParams) => TParams {
  if (route.pathSchema) {
    return compileSchema(route.pathSchema, options)
  }
  return params => params
}

function compileRequestSchema(
  route: Route,
  options: CompileRouteOptions
): (ctx: RequestContext) => unknown {
  if (!route.requestSchema) {
    return () => null
  }

  const decode = compileSchema(route.requestSchema, options)

  if (!bodylessMethods.has(route.method)) {
    return async ({ request }) =>
      decode(
        request.headers.get('Content-Type') === 'application/json'
          ? await request.json()
          : {}
      )
  }

  // The only supported record type is Record<string, never> which doesn't
  // need special handling.
  if (KindGuard.IsRecord(route.requestSchema)) {
    return ({ url }) => decode(Object.fromEntries(url.searchParams))
  }

  return ({ url }) => {
    try {
      var data = jsonQS.decode(url.searchParams)
    } catch (error: any) {
      const schema = Type.String()
      throw new TransformDecodeCheckError(schema, url.search, {
        type: ValueErrorType.String,
        message: error.message,
        errors: [],
        schema,
        path: '/',
        value: url.search,
      })
    }
    return decode(data)
  }
}
