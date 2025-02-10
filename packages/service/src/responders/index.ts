import type { RouteResultFormat } from '@alien-rpc/route'
import { importRouteDefinition } from '../importRouteDefinition'
import type { RouteResponder } from '../types'

import jsonResponder from './json'
import jsonSeqResponder from './json-seq'

export const supportedResponders: Record<RouteResultFormat, RouteResponder> = {
  json: jsonResponder,
  'json-seq': jsonSeqResponder,
  response: route => async (args, ctx) => {
    const routeDef = await importRouteDefinition(route)

    const response: Response = await routeDef.handler.apply(routeDef, args)

    // Copy response headers from the context.
    for (const [name, value] of ctx.response.headers) {
      response.headers.set(name, value)
    }

    if (ctx.request.method === 'HEAD' && route.method === 'GET') {
      return new Response(null, response)
    }
    return response
  },
}
