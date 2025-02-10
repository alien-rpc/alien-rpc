import { importRouteDefinition } from '../importRouteDefinition'
import type { JSON, Promisable } from '../internal/types'
import type { RouteResponder } from '../types'

const responder: RouteResponder = route => async (args, ctx) => {
  const routeDef = await importRouteDefinition(route)

  let result: Promisable<JSON | undefined> = await routeDef.handler.apply(
    routeDef,
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
