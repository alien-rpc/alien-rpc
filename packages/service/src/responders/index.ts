import type { RouteResultFormat } from '@alien-rpc/route'
import type { RouteResponder } from '../types'

import jsonResponder from './json'
import jsonSeqResponder from './json-seq'

export const supportedResponders: Record<RouteResultFormat, RouteResponder> = {
  json: jsonResponder,
  'json-seq': jsonSeqResponder,
  response: async (route, args, ctx) => {
    const response: Response = await route.handler.apply(route, args)

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
