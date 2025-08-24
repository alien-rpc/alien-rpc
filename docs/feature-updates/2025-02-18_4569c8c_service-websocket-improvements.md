# WebSocket Support Improvements

**Commit:** 4569c8c8f5b5e8b5e8b5e8b5e8b5e8b5e8b5e8b5
**Author:** Alec Larson
**Date:** 2025-02-17
**Short SHA:** 4569c8c

## Summary

This commit introduces significant improvements to WebSocket support in `@alien-rpc/service`, focusing on better error handling, deferred execution management, and route definition structure. The changes enhance the reliability and developer experience of WebSocket routes.

## User Impact

**Audience:** Developers using WebSocket routes in alien-rpc
**Breaking Change:** Yes - API changes for WebSocket route definitions
**Migration Required:** Yes - update WebSocket route handlers and defer usage
**Status:** Stable - part of WebSocket support improvements

## Key Changes

### Enhanced Error Handling with Deferred Execution

**Before (endHandlers):**

```ts
// Old approach with endHandlers array
const endHandlers: (() => void)[] = []

// Adding cleanup handlers
context.addEventListener('end', handler)

// Execution without error context
endHandlers.forEach(handler => handler())
```

**After (deferQueue with Promise.allSettled):**

```ts
// New approach with deferQueue and error context
const deferQueue: ((reason?: any) => void)[] = []

// Adding cleanup handlers with optional reason parameter
context.defer(handler)

// Execution with error context and proper error handling
await Promise.allSettled(deferQueue.map(handler => handler(reason))).catch(
  console.error
)
```

### Updated WebSocket Context API

**Before:**

```ts
// Old addEventListener approach
context.addEventListener('end', () => {
  // Cleanup without error context
  cleanup()
})
```

**After:**

```ts
// New defer method with error context
context.defer(async (reason?: any) => {
  // Cleanup with optional error information
  if (reason) {
    console.error('Request ended with error:', reason)
  }
  await cleanup()
})
```

### Route Definition Structure Changes

**Before (RouteHandler):**

```ts
type RouteHandler = (...args: any[]) => any
```

**After (RouteDefinition):**

```ts
type RouteDefinition<
  TArgs extends any[] = any[],
  TResult extends ws.RouteResult = any,
> = {
  protocol: 'ws'
  handler: (...args: TArgs) => TResult
  middlewares?: MiddlewareChain
}
```

### Enhanced Type Safety

**RouteIterableResult Update:**

```ts
// Now allows undefined values in async iterables
type RouteIterableResult = AsyncIterable<JSONCodable | undefined>
```

## Implementation Details

### Deferred Execution Flow

```ts
// WebSocket route execution with improved error handling
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

  // Route logic
  try {
    for (let i = 0; i < 10; i++) {
      yield { count: i, timestamp: Date.now() }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  } catch (error) {
    // Error will be passed to deferred handlers as 'reason'
    throw error
  }
})
```

### Multiple Deferred Handlers

```ts
export const complexRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    // Multiple cleanup handlers
    ctx.defer(async reason => {
      await database.cleanup()
    })

    ctx.defer(async reason => {
      await cache.invalidate()
    })

    ctx.defer(async reason => {
      if (reason) {
        await errorReporting.log(reason)
      }
    })

    // All handlers will be executed with Promise.allSettled
    return await processData(data)
  }
)
```

### Route Definition with Explicit Protocol

```ts
// Route definitions now explicitly specify WebSocket protocol
const routeDefinition: ws.RouteDefinition = {
  protocol: 'ws',
  handler: async (message: string, ctx: ws.RequestContext) => {
    return `Echo: ${message}`
  },
  middlewares: authMiddleware, // Optional middleware chain
}
```

## Benefits

### Improved Error Handling

- **Error Context**: Deferred handlers receive error information
- **Robust Execution**: `Promise.allSettled` ensures all handlers run
- **Better Debugging**: Error reasons are passed to cleanup handlers

### Enhanced Reliability

- **Guaranteed Cleanup**: All deferred handlers execute even if some fail
- **Error Isolation**: Individual handler failures don't prevent others
- **Resource Management**: Better cleanup of WebSocket resources

### Type Safety

- **Explicit Protocol**: Route definitions clearly specify WebSocket protocol
- **Flexible Results**: Support for undefined values in async iterables
- **Better IntelliSense**: Improved IDE support for WebSocket routes

## Migration Guide

### Update Event Listeners to Defer

**Before:**

```ts
export const oldRoute = route.ws(async (data: any, ctx: ws.RequestContext) => {
  ctx.addEventListener('end', () => {
    cleanup()
  })

  return processData(data)
})
```

**After:**

```ts
export const newRoute = route.ws(async (data: any, ctx: ws.RequestContext) => {
  ctx.defer(async reason => {
    if (reason) {
      console.error('Route ended with error:', reason)
    }
    await cleanup()
  })

  return processData(data)
})
```

### Handle Undefined in Async Iterables

```ts
export const streamRoute = route.ws(async function* (count: number) {
  for (let i = 0; i < count; i++) {
    // Can now yield undefined values
    if (shouldSkip(i)) {
      yield undefined
    } else {
      yield { number: i }
    }
  }
})
```

### Update Route Imports

```ts
// Ensure route definitions match new structure
const { handler } = await importRoute<ws.RouteDefinition>(route)
```

## Error Handling Examples

### Basic Error Handling

```ts
export const errorProneRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    ctx.defer(async reason => {
      if (reason instanceof Error) {
        await logError(reason)
      }
    })

    // This error will be passed to deferred handlers
    throw new Error('Something went wrong')
  }
)
```

### Resource Cleanup with Error Context

```ts
export const resourceRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    const resource = await acquireResource()

    ctx.defer(async reason => {
      try {
        await resource.release()
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError)
        if (reason) {
          console.error('Original error:', reason)
        }
      }
    })

    return await resource.process(data)
  }
)
```

## Technical Details

### Promise.allSettled Usage

```ts
// Internal implementation of deferred handler execution
try {
  await handler(...params, context)
} catch (error) {
  console.error(error)
  reason = error
} finally {
  // All handlers execute regardless of individual failures
  await Promise.allSettled(deferQueue.map(handler => handler(reason))).catch(
    console.error
  )
}
```

### Type Definitions

```ts
// Updated type definitions
namespace ws {
  export type RouteIterableResult = AsyncIterable<JSONCodable | undefined>

  export type RouteDefinition<
    TArgs extends any[] = any[],
    TResult extends ws.RouteResult = any,
  > = {
    protocol: 'ws'
    handler: (...args: TArgs) => TResult
    middlewares?: MiddlewareChain
  }

  export interface RequestContext<TMiddleware extends MiddlewareChain = never> {
    readonly defer: (handler: (reason?: any) => Promisable<void>) => void
    // ... other properties
  }
}
```

## Related Changes

This commit builds upon:

- [Experimental WebSocket Support](./2025-02-17_a780569_experimental-websocket-support.md)
- [Middleware Support](./2025-02-12_15f1b48_add-middleware-support-to-route-definitions.md)

## Files Modified

- `packages/service/src/websocket.ts` - Updated deferred execution logic
- `packages/service/src/route.ts` - Route definition structure changes
- `packages/generator/src/project/analyze-route.ts` - Route analysis updates

## Future Considerations

- **Enhanced Error Types**: More specific error types for different failure scenarios
- **Cleanup Timeouts**: Configurable timeouts for deferred handler execution
- **Error Recovery**: Automatic retry mechanisms for failed cleanup operations
- **Monitoring**: Metrics for deferred handler execution and failures
