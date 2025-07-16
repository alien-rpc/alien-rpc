import { getErrorFromResponse, getStackTrace } from '../errorUtils.js'
import type { JSON } from '../json/types.js'
import { resolvePaginationLink } from '../pagination.js'
import type {
  RouteDefinition,
  RouteHandler,
  RouteIterator,
  RouteResponder,
} from '../types.js'

const responder: RouteResponder = (route, args, ctx) => {
  const stream = ReadableStream.from(
    generateJsonTextSequence(route, args, ctx.url)
  )

  // Don't use "application/json-seq" until it's been standardized. Set the
  // content type to octet-stream to prevent response buffering on iOS.
  ctx.setHeader('Content-Type', 'application/octet-stream')
  ctx.setHeader('X-Content-Type', 'application/json-seq')

  return new Response(stream)
}

export default responder

/**
 * Convert a route iterator to a “JSON text sequence” generator.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7464
 */
async function* generateJsonTextSequence(
  route: RouteDefinition,
  args: Parameters<RouteHandler>,
  url: URL
) {
  const encoder = new TextEncoder()
  const separator = new Uint8Array([0x1e]) // ASCII record separator
  const lineFeed = new Uint8Array([0x0a]) // ASCII line feed

  let iterator: RouteIterator | undefined
  let done: boolean | undefined
  let value: JSON
  do {
    try {
      iterator ||= route.handler.apply(route, args) as RouteIterator

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
      if (error instanceof Response) {
        error = getErrorFromResponse(error)
      }
      if (!process.env.TEST) {
        console.error(error)
      }
      error = {
        ...error,
        message: error.message || 'An unknown error occurred',
        stack:
          process.env.NODE_ENV !== 'production'
            ? '\n' + getStackTrace(error)
            : undefined,
      }
      done = true
      value = { $error: error }
    }

    yield separator
    yield encoder.encode(JSON.stringify(value))
    yield lineFeed
  } while (!done)
}
