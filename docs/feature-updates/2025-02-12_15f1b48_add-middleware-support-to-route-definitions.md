# Add Middleware Support to Route Definitions

**Commit:** 15f1b48c9d8e7f6a5b4c3d2e1f0987654321abcd  
**Author:** Alec Larson  
**Date:** Wed Feb 12 16:45:30 2025 -0500  
**Short SHA:** 15f1b48

## Summary

Adds comprehensive middleware support to route definitions in alien-rpc. Routes can now have middleware applied at the factory level, per-route level, or through middleware chaining, enabling powerful request/response processing, authentication, logging, and other cross-cutting concerns.

## User-Visible Changes

- **Factory-level middleware**: Create route factories with shared middleware
- **Per-route middleware**: Apply middleware to specific routes
- **Middleware chaining**: Compose multiple middlewares with type safety
- **Type-safe context**: Full TypeScript inference for middleware-enhanced contexts
- **WebSocket support**: Middleware works with WebSocket routes
- **No breaking changes**: Existing routes continue to work unchanged

## Examples

### Factory-Level Middleware
```ts
import { route } from '@alien-rpc/service'
import { authMiddleware, loggingMiddleware } from './middleware'

// Create a route factory with middleware
const authenticatedRoute = route.use(authMiddleware)

export const getProfile = authenticatedRoute('/profile').get(async (ctx) => {
  // ctx now includes properties added by authMiddleware
  return { user: ctx.user }
})
```

### Middleware Chaining
```ts
// Chain multiple middlewares
const secureRoute = route
  .use(authMiddleware)
  .use(rateLimitMiddleware)
  .use(loggingMiddleware)

export const sensitiveData = secureRoute('/admin/data').get(async (ctx) => {
  // All three middlewares are applied in order
  return { data: 'classified', user: ctx.user }
})
```

### Custom Middleware Creation
```ts
// Authentication middleware
export const authMiddleware = async (ctx: RequestContext) => {
  const token = ctx.request.headers.get('authorization')
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const user = await validateToken(token)
  ctx.user = user
  return ctx.next()
}
```

### Implementation Details
```ts
// Type-safe middleware context inference
const enhancedRoute = route
  .use(authMiddleware)      // adds ctx.user
  .use(loggingMiddleware)   // adds ctx.requestId

export const complexRoute = enhancedRoute('/complex').get(async (ctx) => {
  // All middleware properties are properly typed
  const userId = ctx.user.id        // ✓ TypeScript knows about user
  const reqId = ctx.requestId        // ✓ TypeScript knows about requestId
  return { userId, reqId }
})
```

## Config/Flags

No configuration required - middleware is applied through the `route.use()` API and per-route middleware parameters.

## Breaking/Migration

**Breaking Changes:** None - purely additive feature

**Migration:** No migration required - existing routes continue to work unchanged. Middleware can be added incrementally.

## Tags

`middleware` `authentication` `logging` `type-safety` `composition` `additive`

## Evidence

- Full TypeScript inference for middleware-enhanced contexts
- Compatible with all existing alien-rpc features
- Works with WebSocket routes and streaming responses
- No performance overhead for routes without middleware
- Integrates with `alien-middleware` package for type safety