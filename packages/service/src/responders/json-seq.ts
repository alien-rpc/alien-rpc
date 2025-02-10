import { importRouteDefinition } from '../importRouteDefinition'
import type { JSON } from '../internal/types'
import { resolvePaginationLink } from '../pagination'
import type { RouteIterator, RouteResponder } from '../types'

const responder: RouteResponder = route => async (args, ctx) => {
  const routeDef = await importRouteDefinition(route)

  const result = await routeDef.handler.apply(routeDef, args)
  const stream = ReadableStream.from(generateJsonTextSequence(result, ctx.url))

  // Don't use "application/json-seq" until it's been standardized.
  ctx.response.headers.set('Content-Type', 'text/plain; charset=utf-8')

  return new Response(stream, ctx.response)
}

export default responder

/**
 * Convert a route iterator to a “JSON text sequence” generator.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7464
 */
async function* generateJsonTextSequence(iterator: RouteIterator, url: URL) {
  const encoder = new TextEncoder()

  let done: boolean | undefined
  let value: JSON
  do {
    try {
      const iteration = await iterator.next()
      if (iteration.done) {
        const links = iteration.value
        if (!links) {
          return
        }

        done = true
        value = {
          $prev: links.prev ? resolvePaginationLink(url, links.prev) : null,
          $next: links.next ? resolvePaginationLink(url, links.next) : null,
        }
      } else {
        value = iteration.value as any
      }
    } catch (error: any) {
      done = true
      value = {
        $error: {
          ...error,
          message: error.message,
          stack:
            process.env.NODE_ENV !== 'production' ? error.stack : undefined,
        },
      }
    }

    yield encoder.encode('\u001E') // ASCII record separator
    yield encoder.encode(JSON.stringify(value))
    yield encoder.encode('\n')
  } while (!done)
}
