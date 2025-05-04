import type { RouteResultFormat } from '@alien-rpc/route'
import type { RouteResponder } from '../types.js'

import jsonSeqResponder from './json-seq.js'
import jsonResponder from './json.js'

export const supportedResponders: Record<RouteResultFormat, RouteResponder> = {
  json: jsonResponder,
  'json-seq': jsonSeqResponder,
  response: async (route, args, ctx) => {
    const response: Response = await route.handler.apply(route, args)

    // Avoid sending the body for HEAD requests.
    if (ctx.request.method === 'HEAD') {
      return new Response(null, response)
    }
    return response
  },
}
