import type { JSON, Promisable } from '../internal/types'
import type { RouteResponder } from '../types'

const responder: RouteResponder =
  route =>
  async (args, { request, response }) => {
    const routeDef = await route.import()

    let result: Promisable<JSON | undefined> = await routeDef.handler.apply(
      routeDef,
      args
    )

    if (request.method === 'HEAD') {
      result = null
    } else {
      result = JSON.stringify(result)

      if (result !== undefined) {
        response.headers.set('Content-Type', 'application/json')
      }
    }

    return new Response(result, response)
  }

export default responder
