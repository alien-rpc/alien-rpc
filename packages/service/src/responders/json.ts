import type { Promisable } from '../internal/types.js'
import type { JSONCodable } from '../json/types.js'
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
      ctx.setHeader('Content-Type', 'application/json')
    }
  }

  return new Response(result)
}

export default responder
