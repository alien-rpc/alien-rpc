import type { JSONCodable, Promisable } from '../internal/types.js'
import type { RouteResponder } from '../types.js'

const responder: RouteResponder = async (route, args, ctx) => {
  let result: Promisable<JSONCodable | undefined> = await route.handler.apply(
    route,
    args
  )

  if (ctx.request.method === 'HEAD') {
    result = null
  } else {
    result = JSON.stringify(result)

    if (result !== undefined) {
      ctx.response.headers.set('Content-Type', 'application/json')
    }
  }

  return new Response(result, ctx.response)
}

export default responder
