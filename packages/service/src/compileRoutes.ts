import type { RouteMethod } from '@alien-rpc/route'
import type { RequestContext } from '@hattip/compose'
import type { ValueError } from '@sinclair/typebox/errors'
import { compilePaths } from 'pathic'
import { mapValues } from 'radashi'
import {
  type CompiledRoute,
  compileRoute,
  CompileRouteOptions,
} from './compileRoute.js'
import {
  allowOriginAndCredentials,
  compilePreflightHandler,
  type CorsConfig,
} from './cors.js'
import {
  firstLeafError,
  getErrorFromResponse,
  getStackTrace,
  isDecodeCheckError,
  isDecodeError,
} from './errorUtils.js'
import { JSONCodable } from './internal/types.js'
import { BadRequestError, InternalServerError } from './response.js'
import type { Route, RouteList } from './types.js'
import { isWebSocketRoute } from './websocket.js'

enum RequestStep {
  Match = 0,
  Validate = 1,
  Respond = 2,
}

export interface CompileRoutesOptions extends CompileRouteOptions {
  /**
   * Requests must begin with this prefix to be matched. The prefix should
   * start and end with a slash.
   */
  prefix?: string
  cors?: CorsConfig
}

export function compileRoutes(
  rawRoutes: RouteList,
  options: CompileRoutesOptions = {}
) {
  const routesByMethod = prepareRoutes(
    rawRoutes.filter((route): route is Route => !isWebSocketRoute(route)),
    options
  )

  // Browsers send an OPTIONS request as a preflight request for a CORS
  // request. This handler will respond with Access-Control-Allow headers
  // if matching routes are found.
  const handlePreflightRequest = compilePreflightHandler(
    options.cors || {},
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

    if (options.prefix) {
      if (!url.pathname.startsWith(options.prefix)) {
        return
      }
      url.pathname = url.pathname.slice(options.prefix.length - 1)
    }

    if (request.method === 'OPTIONS') {
      return handlePreflightRequest(ctx)
    }

    const matchRoute = routesByMethod[request.method as RouteMethod]
    if (!matchRoute) {
      return
    }

    const corsHeaders = await allowOriginAndCredentials(ctx, options.cors ?? {})
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
      status: undefined,
      headers: new Headers(corsHeaders),
    }

    let step = RequestStep.Match as RequestStep

    try {
      return await matchRoute(url.pathname, async (route, params) => {
        if (process.env.NODE_ENV !== 'production') {
          ctx.response.headers.set('X-Route-Name', route.name)
        }

        step = RequestStep.Validate
        const args = await route.getHandlerArgs(params, ctx)

        step = RequestStep.Respond
        return await route.responder(args, ctx)
      })
    } catch (error: any) {
      const response = handleRouteError(error, step)
      for (const [name, value] of ctx.response.headers) {
        response.headers.set(name, value)
      }
      return response
    }
  }
}

function prepareRoutes(
  rawRoutes: readonly Route[],
  options: CompileRouteOptions
) {
  const groupedRoutes: Record<RouteMethod, CompiledRoute[]> =
    Object.create(null)

  for (const rawRoute of rawRoutes) {
    const route = compileRoute(rawRoute, options)
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

function handleRouteError(error: any, step: RequestStep) {
  if (step === RequestStep.Respond) {
    if (error instanceof Response) {
      if (!process.env.TEST && process.env.NODE_ENV !== 'production') {
        console.error(getErrorFromResponse(error))
      }
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
      stack: getStackTrace(error),
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
    process.env.NODE_ENV === 'production' ? { message: error.message } : error
  )
}
