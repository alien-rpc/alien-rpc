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
    const body = ctx.request.method !== 'HEAD' ? response.body : null

    const { status, headers } = ctx.response

    // Merge headers from the context, but only if not already set.
    for (const [name, value] of headers) {
      if (!response.headers.has(name)) {
        response.headers.set(name, value)
      }
    }

    // Prefer the context's status if a 200 response is returned.
    if (
      status !== undefined &&
      status !== response.status &&
      response.status === 200
    ) {
      return new Response(body, {
        status,
        headers: response.headers,
      })
    }

    if (body !== response.body) {
      return new Response(body, response)
    }
    return response
  },
}
