import { Type } from '@alien-rpc/typebox'
import { Value } from '@sinclair/typebox/value'
import { createPaginationLink, PaginationResult } from './pagination'
import { RouteContext, RouteDefinition } from './types'

/**
 * Converts an async generator to an NDJSON stream.
 *
 * @see https://github.com/ndjson/ndjson-spec
 */
export async function* ndjson(
  generator: AsyncGenerator<unknown, PaginationResult | null | undefined>,
  route: RouteDefinition,
  ctx: RouteContext
) {
  const iterator = generator[Symbol.asyncIterator]()
  while (true) {
    const iteration = await iterator.next()

    let encodedValue: any
    if (iteration.done) {
      const cursor = iteration.value || {}
      encodedValue = Value.Encode(Type.RpcPagination, {
        prev: cursor.prev ? createPaginationLink(ctx.url, cursor.prev) : null,
        next: cursor.next ? createPaginationLink(ctx.url, cursor.next) : null,
      })
    } else {
      encodedValue = Value.Encode(route.responseSchema, iteration.value)
    }

    yield JSON.stringify(encodedValue)
    yield '\n'

    if (iteration.done) {
      return
    }
  }
}