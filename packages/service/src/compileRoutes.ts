import type { RouteMethod } from '@alien-rpc/route'
import type { RequestContext } from '@hattip/compose'
import type { ValueError } from '@sinclair/typebox/errors'
import {
  TransformDecodeCheckError,
  TransformDecodeError,
} from '@sinclair/typebox/value'
import { compilePaths } from 'pathic'
import { mapValues } from 'radashi'
import { type CompiledRoute, compileRoute } from './compileRoute.js'
import {
  allowOriginAndCredentials,
  compilePreflightHandler,
  type CorsConfig,
} from './cors.js'
import { JSONCodable } from './internal/types.js'
import { BadRequestError, InternalServerError } from './response.js'
import type { Route } from './types.js'

enum RequestStep {
  Match = 0,
  Validate = 1,
  Respond = 2,
}

export interface CompileRoutesConfig {
  /**
   * Requests must begin with this prefix to be matched. The prefix should
   * start and end with a slash.
   */
  prefix?: string
  cors?: CorsConfig
}

export function compileRoutes(
  rawRoutes: readonly Route[],
  config: CompileRoutesConfig = {}
) {
  const routesByMethod = prepareRoutes(rawRoutes)

  // Browsers send an OPTIONS request as a preflight request for a CORS
  // request. This handler will respond with Access-Control-Allow headers
  // if matching routes are found.
  const handlePreflightRequest = compilePreflightHandler(
    config.cors || {},
    ({ url }) => {
      const allowedMethods = new Set<string>()
      for (const matchRoute of Object.values(routesByMethod)) {
        matchRoute(url.pathname, route => {
          allowedMethods.add(route.method)
          return true
        })
      }
      return allowedMethods
    }
  )

  return async (ctx: RequestContext): Promise<Response | undefined> => {
    const { url, request } = ctx

    if (config.prefix) {
      if (!url.pathname.startsWith(config.prefix)) {
        return
      }
      url.pathname = url.pathname.slice(config.prefix.length - 1)
    }

    if (request.method === 'OPTIONS') {
      return handlePreflightRequest(ctx)
    }

    const matchRoute = routesByMethod[request.method as RouteMethod]
    if (!matchRoute) {
      return
    }

    const corsHeaders = await allowOriginAndCredentials(ctx, config.cors ?? {})
    if (
      corsHeaders['Access-Control-Allow-Origin'] !==
      (ctx.request.headers.get('Origin') || '')
    ) {
      return new Response(null, { status: 403 })
    }

    // By mutating these properties, routes can alter the response status
    // and headers. Note that each “responder format” is responsible for
    // using these properties when creating its Response object.
    ctx.response = {
      status: 200,
      headers: new Headers(corsHeaders),
    }

    let step = RequestStep.Match as RequestStep

    try {
      return await matchRoute(url.pathname, async (route, params) => {
        step = RequestStep.Validate
        const args = await route.getHandlerArgs(params, ctx)

        step = RequestStep.Respond
        const result = await route.responder(args, ctx)

        step = RequestStep.Match
        return result
      })
    } catch (error: any) {
      if (step === RequestStep.Respond) {
        // An HttpError is thrown by the application code to indicate a
        // failed request, as opposed to an unexpected error.
        if (error instanceof Response) {
          return error
        }
        if (!process.env.TEST) {
          console.error(error)
        }
        if (process.env.NODE_ENV === 'production') {
          return new Response(null, { status: 500 })
        }
        return new InternalServerError({
          ...error,
          message: error.message ?? 'Internal server error',
          stack: error.stack,
        })
      }

      if (!process.env.TEST && process.env.NODE_ENV === 'development') {
        console.error(error)
      }

      if (step === RequestStep.Validate) {
        const checkError = isDecodeError(error) ? error.error : error
        if (isDecodeCheckError(checkError)) {
          const { message, path, value } = firstLeafError(
            checkError.error
          ) as ValueError & {
            value: JSONCodable
          }
          return new BadRequestError({ message, path, value })
        }
      }

      // Otherwise, it's a malformed request.
      return new BadRequestError(
        process.env.NODE_ENV === 'production'
          ? { message: error.message }
          : error
      )
    }
  }
}

function prepareRoutes(rawRoutes: readonly Route[]) {
  const groupedRoutes: Record<RouteMethod, CompiledRoute[]> =
    Object.create(null)

  for (const rawRoute of rawRoutes) {
    const route = compileRoute(rawRoute)
    groupedRoutes[route.method] ??= []
    groupedRoutes[route.method].push(route)
    if (route.method === 'GET') {
      groupedRoutes.HEAD ??= []
      groupedRoutes.HEAD.push(route)
    }
  }

  return mapValues(groupedRoutes, routes => {
    const match = compilePaths(routes.map(route => route.path))

    return <TResult>(
      path: string,
      handler: (route: CompiledRoute, params: Record<string, string>) => TResult
    ) =>
      match(path, (index, params) => {
        return handler(routes[index], params)
      })
  })
}

function isDecodeError(error: any): error is TransformDecodeError {
  return error instanceof TransformDecodeError
}

function isDecodeCheckError(error: any): error is TransformDecodeCheckError {
  return error instanceof TransformDecodeCheckError
}

function firstLeafError(error: ValueError) {
  for (const suberror of flat(error.errors)) {
    if (suberror.errors) {
      return firstLeafError(suberror)
    }
    return suberror
  }
  return error
}

function* flat<T>(iterables: Iterable<T>[]) {
  for (const iterable of iterables) {
    yield* iterable
  }
}
