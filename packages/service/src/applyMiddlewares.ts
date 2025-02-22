import {
  RequestContext,
  RequestHandler,
  RequestHandlerStack,
} from '@hattip/compose'
import { Promisable } from './internal/types.js'

const appliedMiddlewares = new WeakMap<RequestContext, Set<RequestHandler>>()

export async function applyMiddlewares(
  stack: RequestHandlerStack[],
  ctx: RequestContext,
  next: () => Promisable<Response>
) {
  const applied = appliedMiddlewares.get(ctx) ?? new Set()
  appliedMiddlewares.set(ctx, applied)

  let i = 0
  const outerNext = ctx.next
  const middlewares = stack.flat()

  return (ctx.next = async (): Promise<Response> => {
    while (i < middlewares.length) {
      const middleware = middlewares[i++]
      if (!middleware || applied.has(middleware)) {
        continue
      }
      applied.add(middleware)
      const result = await middleware(ctx)
      if (result instanceof Response) {
        return result
      }
    }
    ctx.next = outerNext
    return next()
  })()
}
