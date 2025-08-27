# WebSocket Support Improvements

**Commit:** 4569c8c  
**Date:** 2025-02-18

## Summary

Improves WebSocket support with better error handling, deferred execution management, and enhanced route definition structure. Replaces `addEventListener('end')` with `ctx.defer()` for more reliable cleanup and error context.

## User-Visible Changes

- **Enhanced error handling** - Deferred handlers receive error context with `reason` parameter
- **Improved cleanup reliability** - `Promise.allSettled` ensures all handlers execute
- **New defer API** - `ctx.defer(handler)` replaces `ctx.addEventListener('end', handler)`
- **Route definition structure** - Explicit protocol specification with `RouteDefinition` type
- **Flexible async iterables** - Support for `undefined` values in streaming responses
- **Better type safety** - Enhanced TypeScript support for WebSocket routes

## Examples

### New Defer API
```ts
// Before: addEventListener approach
context.addEventListener('end', () => {
  cleanup() // No error context
})

// After: defer with error context
context.defer(async (reason?: any) => {
  if (reason) {
    console.error('Request ended with error:', reason)
  }
  await cleanup()
})
```

### Enhanced Error Handling
```ts
export const exampleRoute = route.ws(async function* (
  data: any,
  ctx: ws.RequestContext
) {
  // Register cleanup handlers
  ctx.defer(async reason => {
    if (reason) {
      console.error('Route ended with error:', reason)
      await errorCleanup(reason)
    } else {
      await normalCleanup()
    }
  })

  // Route logic with automatic error propagation
  for (let i = 0; i < 10; i++) {
    yield { count: i, timestamp: Date.now() }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
})
```

### Multiple Deferred Handlers
```ts
export const complexRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    // Multiple cleanup handlers - all execute with Promise.allSettled
    ctx.defer(async reason => await database.cleanup())
    ctx.defer(async reason => await cache.invalidate())
    ctx.defer(async reason => {
      if (reason) await errorReporting.log(reason)
    })

    return await processData(data)
  }
)
```

### Route Definition Structure
```ts
// New explicit route definition structure
const routeDefinition: ws.RouteDefinition = {
  protocol: 'ws',
  handler: async (message: string, ctx: ws.RequestContext) => {
    return `Echo: ${message}`
  },
  middlewares: authMiddleware // Optional middleware chain
}
```

## Config/Flags

**Route Definition Options:**
- `protocol: 'ws'` - Explicit WebSocket protocol specification
- `handler` - Route handler function with enhanced context
- `middlewares` - Optional middleware chain support

**Context Methods:**
- `ctx.defer(handler)` - Register cleanup handler with error context
- `reason` parameter - Optional error information passed to deferred handlers

**Type Enhancements:**
- `RouteIterableResult` - Now supports `undefined` values in async iterables
- `RouteDefinition<TArgs, TResult>` - Explicit route structure with generics

## Breaking/Migration

**Breaking Changes:**
- `ctx.addEventListener('end')` → `ctx.defer(handler)` for cleanup
- Route definitions now require explicit `protocol: 'ws'`
- `RouteIterableResult` now supports `undefined` values

**Migration Steps:**
1. Replace `addEventListener('end')` with `ctx.defer()`
2. Add `protocol: 'ws'` to route definitions
3. Update type annotations for routes that yield `undefined`

## Tags

`websocket` `error-handling` `cleanup` `type-safety` `reliability` `deferred-execution` `promise-allsettled`

## Evidence

**Modified Files:**
- `packages/service/src/websocket.ts` - Updated deferred execution logic
- `packages/service/src/route.ts` - Route definition structure changes
- `packages/generator/src/project/analyze-route.ts` - Route analysis updates

**Technical Implementation:**
- Uses `Promise.allSettled` for robust handler execution
- Deferred handlers receive error context via `reason` parameter
- Maintains backward compatibility where possible
- Requires TypeScript 4.5+ for proper type inference
