# Migrate to alien-middleware

**Commit:** fce689065c8ea4c6846582d42e08187d9efe0d9f  
**Author:** Alec Larson  
**Date:** Sun May 4 19:04:15 2025 -0400  
**Short SHA:** fce6890

## Summary

This is a **breaking change** that migrates alien-rpc from `@hattip/compose` to `alien-middleware`, providing a safer and more type-safe middleware API. The migration enhances middleware composition, improves type inference, and reduces external dependencies while maintaining backward compatibility for most use cases.

## User Impact

**Audience:** Backend developers using alien-rpc service with middleware  
**Breaking Change:** Yes - middleware API and dependency changes  
**Migration Required:** Yes - update middleware imports and potentially middleware implementations  
**Status:** Stable - part of middleware system improvements

## Key Changes

### Removed
- `@hattip/compose` dependency from service package
- Legacy middleware composition patterns
- Some internal middleware utilities that were HatTip-specific

### Added
- `alien-middleware` dependency (v0.10.0)
- Enhanced type-safe middleware system
- Improved middleware chain composition
- Better middleware context propagation
- Safer middleware execution model

### Enhanced
- `RouteDefinition` interface now uses `MiddlewareChain` from alien-middleware
- Route factory functions with improved middleware typing
- Middleware context types with better inference
- Error handling in middleware execution

## Breaking Changes

### 1. Middleware Import Changes

**Before:**
```ts
import { compose } from '@hattip/compose'
import type { RequestContext } from '@hattip/compose'

// HatTip-style middleware
const middleware = (ctx: RequestContext) => {
  // middleware logic
  return ctx.next()
}
```

**After:**
```ts
import { chain, type MiddlewareContext } from 'alien-middleware'

// alien-middleware style
const middleware = (ctx: MiddlewareContext) => {
  // middleware logic
  return ctx.next()
}
```

### 2. Route Definition Changes

**Before:**
```ts
import type { RouteDefinition } from '@alien-rpc/service'

// Old RouteDefinition structure
const routeDefinition: RouteDefinition = {
  method: 'GET',
  path: '/api/users',
  handler: async (ctx) => { /* ... */ },
  // middleware was handled differently
}
```

**After:**
```ts
import type { RouteDefinition, MiddlewareChain } from '@alien-rpc/service'

// New RouteDefinition with MiddlewareChain
const routeDefinition: RouteDefinition = {
  method: 'GET',
  path: '/api/users',
  handler: async (ctx) => { /* ... */ },
  middleware?: MiddlewareChain // Now uses alien-middleware types
}
```

### 3. Middleware Composition Changes

**Before:**
```ts
import { compose } from '@hattip/compose'

// HatTip composition
const handler = compose(
  loggingMiddleware,
  authMiddleware,
  routeHandler
)
```

**After:**
```ts
import { chain } from 'alien-middleware'

// alien-middleware composition
const middlewareChain = chain(loggingMiddleware)
  .use(authMiddleware)

// Used with route factory
const authenticatedRoute = route.use(middlewareChain)
```

## Migration Guide

### Step 1: Update Dependencies

```bash
# Remove old dependency
npm uninstall @hattip/compose

# alien-middleware is now included with @alien-rpc/service
# No additional installation needed
```

### Step 2: Update Middleware Imports

```ts
// Before
import type { RequestContext } from '@hattip/compose'

// After
import type { MiddlewareContext } from 'alien-middleware'
```

### Step 3: Update Middleware Implementations

```ts
// Before - HatTip middleware
const loggingMiddleware = (ctx: RequestContext) => {
  console.log(`${ctx.request.method} ${ctx.url.pathname}`)
  return ctx.next()
}

// After - alien-middleware (mostly the same)
const loggingMiddleware = (ctx: MiddlewareContext) => {
  console.log(`${ctx.request.method} ${ctx.url.pathname}`)
  return ctx.next()
}
```

### Step 4: Update Route Definitions

```ts
// Before - manual middleware handling
export const getUser = route('/users/:id').get(async (id, ctx) => {
  // Manual auth check
  if (!ctx.user) {
    throw new Error('Unauthorized')
  }
  return await fetchUser(id)
})

// After - use middleware chain
const authenticatedRoute = route.use(authMiddleware)
export const getUser = authenticatedRoute('/users/:id').get(async (id, ctx) => {
  // ctx.user is now guaranteed by middleware
  return await fetchUser(id)
})
```

### Step 5: Update Server Composition

```ts
// Before - using @hattip/compose
import { compose } from '@hattip/compose'
import { compileRoutes } from '@alien-rpc/service'

export default compose(
  loggingMiddleware,
  compileRoutes(routes),
  fallbackMiddleware
)

// After - alien-middleware handles composition internally
import { compileRoutes } from '@alien-rpc/service'

// Middleware is now handled at the route level
export default compileRoutes(routes)
```

## New Features

### Enhanced Type Safety

```ts
import { route, type RouteContext } from '@alien-rpc/service'

const authMiddleware = (ctx: MiddlewareContext) => {
  ctx.user = { id: '123', name: 'John' }
  return ctx.next()
}

const authenticatedRoute = route.use(authMiddleware)

// TypeScript now infers the enhanced context type
export const getProfile = authenticatedRoute('/profile').get(
  async (ctx: RouteContext<typeof authenticatedRoute>) => {
    // ctx.user is properly typed and guaranteed to exist
    return { user: ctx.user }
  }
)
```

### Improved Middleware Chaining

```ts
// Chain multiple middlewares with better type inference
const secureRoute = route
  .use(corsMiddleware)
  .use(authMiddleware)
  .use(rateLimitMiddleware)

export const sensitiveData = secureRoute('/admin/data').get(async (ctx) => {
  // All middleware effects are properly typed
  return { data: 'classified', user: ctx.user }
})
```

### Better Error Handling

```ts
const errorHandlingMiddleware = async (ctx: MiddlewareContext) => {
  try {
    return await ctx.next()
  } catch (error) {
    // Enhanced error context and handling
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

## Benefits

### Improved Type Safety
- Better TypeScript inference for middleware context
- Compile-time validation of middleware chains
- Enhanced IDE support and autocomplete

### Safer API
- More predictable middleware execution order
- Better error propagation and handling
- Reduced risk of middleware composition bugs

### Reduced Dependencies
- Eliminates `@hattip/compose` dependency
- Smaller bundle size
- Fewer external dependencies to maintain

### Enhanced Developer Experience
- Clearer middleware composition patterns
- Better error messages and debugging
- More intuitive API design

## Implementation Details

### Files Modified
- `packages/service/package.json` - Updated dependencies
- `packages/service/src/types.ts` - Updated middleware types
- `packages/service/src/route.ts` - Enhanced route factory with alien-middleware
- `packages/service/src/compileRoute.ts` - Updated route compilation
- `packages/service/src/compileRoutes.ts` - Updated routes compilation
- `packages/service/src/responders/` - Updated responder middleware handling
- `packages/service/src/websocket.ts` - Updated WebSocket middleware integration

### Dependency Changes
```json
{
  "dependencies": {
    "alien-middleware": "^0.10.0"
  },
  "removed": {
    "@hattip/compose": "removed"
  }
}
```

## Compatibility Notes

### Backward Compatibility
- Most existing middleware will work with minimal changes
- Route definitions remain largely compatible
- Generated client code is unaffected

### Breaking Changes Summary
- Import paths changed from `@hattip/compose` to `alien-middleware`
- `RequestContext` type renamed to `MiddlewareContext`
- Middleware composition API updated
- Some internal middleware utilities removed

## Troubleshooting

### Common Migration Issues

**Issue:** `Cannot find module '@hattip/compose'`
```ts
// Solution: Update imports
// Before
import { compose } from '@hattip/compose'

// After
import { chain } from 'alien-middleware'
```

**Issue:** `Property 'user' does not exist on type 'MiddlewareContext'`
```ts
// Solution: Use proper typing
const authenticatedRoute = route.use(authMiddleware)
export const handler = authenticatedRoute('/path').get(
  async (ctx: RouteContext<typeof authenticatedRoute>) => {
    // ctx.user is now properly typed
    return ctx.user
  }
)
```

**Issue:** Middleware not executing in expected order
```ts
// Solution: Use explicit chaining
const middlewareChain = chain(firstMiddleware)
  .use(secondMiddleware)
  .use(thirdMiddleware)

const enhancedRoute = route.use(middlewareChain)
```

## Future Considerations

### Planned Enhancements
- Additional middleware utilities and helpers
- Performance optimizations for middleware chains
- Enhanced debugging and development tools
- Integration with popular middleware libraries

### Migration Timeline
- **Immediate:** Update imports and basic middleware
- **Short-term:** Migrate complex middleware compositions
- **Long-term:** Adopt new alien-middleware features

## References

**External Documentation:**
- [alien-middleware GitHub](https://github.com/alloc/alien-middleware)
- [Migration from HatTip](https://github.com/alloc/alien-middleware/blob/main/docs/migration-from-hattip.md)

**Related Changes:**
- [Add Middleware Support](./2025-02-12_15f1b48_add-middleware-support-to-route-definitions.md)
- [WebSocket Improvements](./2025-02-18_4569c8c_service-websocket-improvements.md)

**Files Modified:**
- `packages/service/src/types.ts` - Middleware type definitions
- `packages/service/src/route.ts` - Route factory enhancements
- `packages/service/src/compileRoute.ts` - Route compilation updates
- `packages/service/src/compileRoutes.ts` - Routes compilation updates
- `packages/service/src/responders/` - Responder middleware integration
- `packages/service/src/websocket.ts` - WebSocket middleware updates

This migration represents a significant improvement in alien-rpc's middleware system, providing better type safety, improved developer experience, and a more maintainable codebase while reducing external dependencies.