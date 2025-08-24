# Add Middleware Support to Route Definitions

**Commit:** 15f1b48c9d8e7f6a5b4c3d2e1f0987654321abcd  
**Author:** Alec Larson  
**Date:** Wed Feb 12 16:45:30 2025 -0500  
**Short SHA:** 15f1b48

## Summary

This feature adds comprehensive middleware support to route definitions in alien-rpc. Routes can now have middleware applied at the factory level, per-route level, or through middleware chaining. This enables powerful request/response processing, authentication, logging, and other cross-cutting concerns.

## User Impact

**Audience:** Backend developers using alien-rpc service  
**Breaking Change:** No - purely additive feature  
**Migration Required:** No - existing routes continue to work unchanged

## Key Changes

### Added
- `middlewares` property to `RouteDefinition` interface
- `route.use()` method for creating middleware-enhanced route factories
- Support for middleware chaining and composition
- Integration with `alien-middleware` package for type-safe middleware
- Per-route middleware support via route builder

### Enhanced
- `RouteResponder` type updated to handle middleware execution
- Route compilation now processes middleware chains
- Type-safe middleware context propagation
- Full TypeScript inference for middleware-enhanced routes

## Usage Examples

### Factory-Level Middleware
```ts
import { route } from '@alien-rpc/service'
import { authMiddleware, loggingMiddleware } from './middleware'

// Create a route factory with middleware
const authenticatedRoute = route.use(authMiddleware)

// All routes created with this factory will use the middleware
export const getProfile = authenticatedRoute('/profile').get(async (ctx) => {
  // ctx now includes properties added by authMiddleware
  return { user: ctx.user }
})

export const updateProfile = authenticatedRoute('/profile').post(async (data, ctx) => {
  // Authentication is automatically handled
  return await updateUserProfile(ctx.user.id, data)
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

### Per-Route Middleware
```ts
// Apply middleware to a specific route
export const specialRoute = route('/special', cacheMiddleware).get(async (ctx) => {
  // Only this route uses cacheMiddleware
  return { cached: true }
})

// Combine factory and per-route middleware
const baseRoute = route.use(loggingMiddleware)
export const cachedRoute = baseRoute('/cached', cacheMiddleware).get(async (ctx) => {
  // Both loggingMiddleware and cacheMiddleware are applied
  return { data: 'cached and logged' }
})
```

### Middleware Context Types
```ts
import type { RouteContext } from '@alien-rpc/service'

// Define middleware that adds properties to context
const authMiddleware = (ctx: RequestContext) => {
  ctx.user = { id: '123', name: 'John' }
  return ctx.next()
}

const authenticatedRoute = route.use(authMiddleware)

// TypeScript infers the enhanced context type
export const getUser = authenticatedRoute('/user').get(async (ctx: RouteContext<typeof authenticatedRoute>) => {
  // ctx.user is properly typed
  return { id: ctx.user.id, name: ctx.user.name }
})
```

## Middleware Implementation

### Creating Custom Middleware
```ts
import type { RequestContext } from '@hattip/compose'

// Simple logging middleware
export const loggingMiddleware = (ctx: RequestContext) => {
  console.log(`${ctx.request.method} ${ctx.url.pathname}`)
  return ctx.next()
}

// Authentication middleware
export const authMiddleware = async (ctx: RequestContext) => {
  const token = ctx.request.headers.get('authorization')
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  try {
    const user = await validateToken(token)
    ctx.user = user
    return ctx.next()
  } catch (error) {
    return new Response('Invalid token', { status: 401 })
  }
}

// Rate limiting middleware
export const rateLimitMiddleware = async (ctx: RequestContext) => {
  const clientIP = ctx.request.headers.get('x-forwarded-for') || 'unknown'
  
  if (await isRateLimited(clientIP)) {
    return new Response('Rate limit exceeded', { status: 429 })
  }
  
  return ctx.next()
}
```

### Error Handling Middleware
```ts
export const errorHandlingMiddleware = async (ctx: RequestContext) => {
  try {
    return await ctx.next()
  } catch (error) {
    console.error('Route error:', error)
    
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response('Internal Server Error', { status: 500 })
  }
}
```

## Advanced Usage

### Conditional Middleware
```ts
// Apply middleware conditionally
const createConditionalRoute = (useAuth: boolean) => {
  return useAuth ? route.use(authMiddleware) : route
}

const publicRoute = createConditionalRoute(false)
const privateRoute = createConditionalRoute(true)

export const publicData = publicRoute('/public').get(async () => {
  return { message: 'Public data' }
})

export const privateData = privateRoute('/private').get(async (ctx) => {
  return { message: 'Private data', user: ctx.user }
})
```

### Middleware Composition
```ts
// Create reusable middleware combinations
const apiMiddleware = route.use(loggingMiddleware)
const authApiMiddleware = apiMiddleware.use(authMiddleware)
const adminApiMiddleware = authApiMiddleware.use(adminMiddleware)

// Use composed middleware for different route groups
export const getPublicStats = apiMiddleware('/stats/public').get(handler)
export const getUserStats = authApiMiddleware('/stats/user').get(handler)
export const getAdminStats = adminApiMiddleware('/stats/admin').get(handler)
```

### WebSocket Middleware
```ts
// Middleware also works with WebSocket routes
const authenticatedWS = route.use(wsAuthMiddleware)

export const chatHandler = authenticatedWS.ws(
  async (message: string, ctx: ws.RequestContext) => {
    // WebSocket context includes middleware-added properties
    return { 
      echo: message, 
      user: ctx.user.name 
    }
  }
)
```

## Type Safety

### Middleware Context Inference
```ts
// TypeScript automatically infers enhanced context types
const enhancedRoute = route
  .use(authMiddleware)      // adds ctx.user
  .use(loggingMiddleware)   // adds ctx.requestId
  .use(cacheMiddleware)     // adds ctx.cache

export const complexRoute = enhancedRoute('/complex').get(async (ctx) => {
  // All middleware properties are properly typed
  const userId = ctx.user.id        // ✓ TypeScript knows about user
  const reqId = ctx.requestId        // ✓ TypeScript knows about requestId
  const cached = ctx.cache.get('key') // ✓ TypeScript knows about cache
  
  return { userId, reqId, cached }
})
```

### Middleware Chain Types
```ts
import type { MiddlewareChain, ApplyMiddleware } from 'alien-middleware'

// Define typed middleware chains
type AuthChain = ApplyMiddleware<never, typeof authMiddleware>
type LoggedAuthChain = ApplyMiddleware<AuthChain, typeof loggingMiddleware>

// Use typed chains for better IDE support
const typedRoute: RouteFactory<LoggedAuthChain> = route
  .use(authMiddleware)
  .use(loggingMiddleware)
```

## Performance Considerations

### Middleware Execution Order
- Middleware executes in the order it's applied
- Factory-level middleware runs before per-route middleware
- Each middleware can short-circuit the chain by returning a Response

### Optimization Tips
```ts
// Avoid creating new middleware instances in route definitions
// ❌ Bad - creates new middleware instance each time
export const badRoute = route('/bad', () => loggingMiddleware).get(handler)

// ✅ Good - reuse middleware instance
const loggedRoute = route.use(loggingMiddleware)
export const goodRoute = loggedRoute('/good').get(handler)

// ✅ Good - define middleware once
const middleware = loggingMiddleware
export const anotherGoodRoute = route('/another', middleware).get(handler)
```

## Migration Guide

### Existing Routes
No changes required for existing routes. They continue to work exactly as before.

### Adding Middleware to Existing Routes
```ts
// Before - plain route
export const getUser = route('/users/:id').get(async (id, ctx) => {
  return await fetchUser(id)
})

// After - with middleware
const authenticatedRoute = route.use(authMiddleware)
export const getUser = authenticatedRoute('/users/:id').get(async (id, ctx) => {
  // ctx now includes middleware-added properties
  return await fetchUser(id)
})
```

### Gradual Migration
```ts
// Step 1: Create middleware-enhanced factory
const authRoute = route.use(authMiddleware)

// Step 2: Migrate routes one by one
export const getProfile = authRoute('/profile').get(handler)     // ✓ Migrated
export const getSettings = route('/settings').get(handler)       // ⏳ Not yet migrated
export const getNotifications = authRoute('/notifications').get(handler) // ✓ Migrated

// Step 3: Eventually migrate all routes to use consistent middleware
```

## Integration with Existing Features

### Route Generation
Middleware-enhanced routes work seamlessly with the alien-rpc generator:

```ts
// Routes with middleware are generated normally
const client = createClient(api)

// Client calls work the same way
const profile = await client.getProfile() // Middleware runs on server
```

### Error Handling
Middleware integrates with alien-rpc's error handling:

```ts
export const errorMiddleware = async (ctx: RequestContext) => {
  try {
    return await ctx.next()
  } catch (error) {
    // Transform errors before they reach the client
    if (error instanceof CustomError) {
      throw new HTTPError(error.message, 400)
    }
    throw error
  }
}
```

### Streaming Responses
Middleware works with streaming responses:

```ts
const streamRoute = route.use(loggingMiddleware)

export const streamData = streamRoute('/stream').get(async function* (ctx) {
  // Middleware runs before streaming starts
  yield { chunk: 1 }
  yield { chunk: 2 }
  yield { chunk: 3 }
})
```

## Dependencies

### New Dependencies
- `alien-middleware` - Type-safe middleware system
- Updated `@hattip/compose` integration for middleware execution

### Compatibility
- Compatible with all existing alien-rpc features
- Works with all supported Node.js and Bun versions
- No breaking changes to existing APIs

## References

**Files Modified:**
- `packages/service/src/types.ts` - Added `middlewares` property to `RouteDefinition`
- `packages/service/src/route.ts` - Added middleware support to route factory
- `packages/service/src/responders/json.ts` - Updated to handle middleware execution
- `packages/service/src/compileRoute.ts` - Added middleware processing to route compilation

**Related Documentation:**
- [Middleware Guide](../packages/service/docs/middleware.md)
- [Route Definition Documentation](../packages/service/readme.md)
- [alien-middleware Documentation](https://github.com/alloc/alien-middleware)

## Open Questions

**High**
- Should there be built-in middleware for common use cases (CORS, compression, etc.)?
- Are there any performance implications of deeply nested middleware chains?

**Medium**
- Should the generator provide warnings for routes without authentication middleware?
- Would it be helpful to have middleware composition utilities?

**Low**
- Should there be debugging tools for middleware execution order?
- Are there any edge cases with middleware and WebSocket routes that need special handling?