# WebSocket Handler Improvements and Fixes

**Commit:** 110075bd109833c163e5049516edc61251668582
**Author:** Alec Larson
**Date:** 2025-02-19
**Short SHA:** 110075b

## Summary

This commit introduces critical improvements and fixes to WebSocket handlers in `@alien-rpc/service`, focusing on enhanced error handling, proper validation error reporting, automatic defer queue flushing, and improved type inference. These changes bring WebSocket error handling in line with HTTP handlers and improve overall reliability.

## User Impact

**Audience:** Developers using WebSocket routes in alien-rpc
**Breaking Change:** No - purely improvements and bug fixes
**Migration Required:** No - existing code benefits automatically
**Status:** Stable - essential reliability improvements

## Key Changes

### Enhanced TypeBox Validation Error Handling

**Before (Generic Error Handling):**

```ts
// WebSocket handlers had basic error handling
try {
  const result = await handler(...params, context)
  peer.send({ id, result })
} catch (error) {
  peer.send({
    id,
    error: {
      code: 500,
      message: isError(error) ? error.message : String(error),
    },
  })
}
```

**After (TypeBox-Aware Error Handling):**

```ts
// WebSocket handlers now handle TypeBox validation errors like HTTP handlers
try {
  const result = await handler(...params, context)
  peer.send({ id, result })
} catch (error) {
  if (error instanceof Response) {
    // Handle Response objects
    peer.send({
      id,
      error: {
        code: error.status,
        message: error.statusText,
        ...(error as JsonResponse<any>).decodedBody,
      },
    })
  } else {
    const checkError = isDecodeError(error) ? error.error : error
    if (isDecodeCheckError(checkError)) {
      // Special handling for TypeBox validation errors
      const { message, path, value } = firstLeafError(
        checkError.error
      ) as ValueError & {
        value: JSONCodable
      }
      peer.send({
        id,
        error: {
          code: 400,
          message,
          data: { path, value },
          stack:
            process.env.NODE_ENV !== 'production'
              ? getStackTrace(checkError)
              : undefined,
        },
      })
    } else {
      // Generic error handling
      peer.send({
        id,
        error: {
          code: 500,
          message: isError(error) ? error.message : String(error),
          stack:
            process.env.NODE_ENV !== 'production' && isError(error)
              ? getStackTrace(error)
              : undefined,
        },
      })
    }
  }
}
```

### Automatic Defer Queue Flushing on AbortSignal

**Before (Manual Defer Queue Management):**

```ts
// Defer queue was only flushed at the end of request handling
const deferQueue: ((reason?: any) => void)[] = []
const context = createWebSocketContext(peer, deferQueue, ctrl.signal)

try {
  const result = await handler(...params, context)
  // ... handle result
} finally {
  // Only flushed here - not when request is aborted
  await Promise.allSettled(deferQueue.map(handler => handler(reason))).catch(
    console.error
  )
}
```

**After (Automatic Flushing on Abort):**

```ts
// Defer queue is automatically flushed when AbortSignal fires
const deferQueue: ((reason?: any) => void)[] = []
const flushDeferQueue = (reason?: any) => {
  if (deferQueue.length) {
    if (ctrl.signal.aborted) {
      reason = ctrl.signal.reason
    }
    Promise.allSettled(deferQueue.map(handler => handler(reason))).catch(
      console.error
    )
    deferQueue.length = 0
  }
}

const ctrl = new AbortController()
ctrl.signal.addEventListener('abort', flushDeferQueue)
const context = createWebSocketContext(peer, deferQueue, ctrl.signal)

try {
  const result = await handler(...params, context)
  // ... handle result
  flushDeferQueue() // Flush on success
} catch (error) {
  // ... handle error
  flushDeferQueue(error) // Flush on error with reason
}
```

### Proper Route Handler Import

**Before (Incorrect Import):**

```ts
// Route handler import was not properly typed
const handler = await importRoute(route)
```

**After (Correctly Typed Import):**

```ts
// Route handler import now uses proper typing
const { handler } = await importRoute<RouteDefinition>(route)
```

### Enhanced Type Inference for ws.compileRoutes

**Before (Generic Return Type):**

```ts
// Return type was not properly inferred from createAdapter
export function compileRoutes(
  routes: RouteList,
  createAdapter: (options: WebSocketAdapterOptions) => WebSocketAdapter
): WebSocketAdapter
```

**After (Inferred Return Type):**

```ts
// Return type is now properly inferred from createAdapter argument
export function compileRoutes<TAdapter extends WebSocketAdapter>(
  routes: RouteList,
  createAdapter: (options: WebSocketAdapterOptions) => TAdapter
): TAdapter
```

## Implementation Details

### Error Utilities Integration

```ts
// New error utilities imported from errorUtils.ts
import {
  firstLeafError,
  getStackTrace,
  isDecodeCheckError,
  isDecodeError,
  type ValueError,
} from './errorUtils.js'

// These utilities were previously duplicated in compileRoutes.ts
// Now they're centralized and shared between HTTP and WebSocket handlers
```

### TypeBox Validation Error Flow

```ts
// Example of improved validation error handling
export const validateUserRoute = route.ws(
  async (userData: { name: string; email: string }, ctx: ws.RequestContext) => {
    // If userData fails validation, the error is now properly formatted
    return { message: `Hello ${userData.name}!` }
  }
)

// Client receives detailed validation error:
// {
//   id: "request-123",
//   error: {
//     code: 400,
//     message: "Expected string",
//     data: {
//       path: "/email",
//       value: null
//     },
//     stack: "..." // Only in development
//   }
// }
```

### Defer Queue with AbortSignal Integration

```ts
export const resourceRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    const resource = await acquireResource()

    // Cleanup handler is automatically called when request is aborted
    ctx.defer(async reason => {
      console.log('Cleaning up resource:', reason ? 'aborted' : 'completed')
      await resource.release()
    })

    // If client disconnects or request is cancelled,
    // the defer handler will be called with the abort reason
    return await processWithResource(resource, data)
  }
)
```

### Enhanced Error Response Format

```ts
// WebSocket error responses now include stack traces in development
{
  id: "request-456",
  error: {
    code: 500,
    message: "Database connection failed",
    stack: process.env.NODE_ENV !== 'production' ? "Error: Database connection failed\n    at handler (/app/routes.ts:42:11)" : undefined
  }
}

// TypeBox validation errors include path and value information
{
  id: "request-789",
  error: {
    code: 400,
    message: "Expected number",
    data: {
      path: "/age",
      value: "not-a-number"
    }
  }
}
```

## Benefits

### Consistent Error Handling

- **Parity with HTTP**: WebSocket handlers now have the same error handling as HTTP handlers
- **Better Debugging**: Stack traces and detailed validation errors in development
- **Client-Friendly**: Structured error responses with codes and data

### Improved Reliability

- **Automatic Cleanup**: Defer queue is flushed even when requests are aborted
- **Resource Management**: Better cleanup of resources when connections are lost
- **Error Isolation**: Individual handler failures don't affect other requests

### Enhanced Developer Experience

- **Type Safety**: Proper type inference for compiled routes
- **Better Errors**: Detailed validation error messages with context
- **Consistent API**: Same error handling patterns across HTTP and WebSocket

## Usage Examples

### Validation Error Handling

```ts
// Define a route with strict validation
export const createUserRoute = route.ws(
  async (
    userData: {
      name: string
      email: string
      age: number
    },
    ctx: ws.RequestContext
  ) => {
    const user = await db.users.create(userData)
    return { id: user.id, message: 'User created successfully' }
  }
)

// Client sends invalid data
client.send({
  method: 'createUserRoute',
  params: {
    name: 'John',
    email: 'invalid-email', // Invalid email format
    age: 'twenty-five', // Should be number
  },
  id: 'req-1',
})

// Server responds with detailed validation error
// {
//   id: 'req-1',
//   error: {
//     code: 400,
//     message: 'Expected number',
//     data: {
//       path: '/age',
//       value: 'twenty-five'
//     }
//   }
// }
```

### Resource Cleanup with AbortSignal

```ts
export const streamDataRoute = route.ws(async function* (
  query: string,
  ctx: ws.RequestContext
) {
  const connection = await database.connect()
  const subscription = await pubsub.subscribe(query)

  // Both resources will be cleaned up if request is aborted
  ctx.defer(async reason => {
    console.log('Cleaning up:', reason ? 'aborted' : 'completed')
    await subscription.unsubscribe()
    await connection.close()
  })

  // Stream data until client disconnects or cancels
  for await (const data of subscription) {
    yield { timestamp: Date.now(), data }
  }
})

// If client disconnects or sends .cancel message,
// both database connection and subscription are properly cleaned up
```

### Error Response Handling

```ts
export const riskyRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    if (Math.random() < 0.5) {
      // Throw a custom Response error
      throw new JSONResponse({ error: 'Custom error' }, { status: 422 })
    }

    if (Math.random() < 0.5) {
      // Throw a regular error
      throw new Error('Something went wrong')
    }

    return { success: true }
  }
)

// Client receives different error formats based on error type:
// Custom Response: { id, error: { code: 422, error: 'Custom error' } }
// Regular Error: { id, error: { code: 500, message: 'Something went wrong' } }
```

### Type-Safe Route Compilation

```ts
// Route compilation now properly infers return type
const wsHandler = ws.compileRoutes(routes, createHattipAdapter, {
  onConnect: async peer => {
    console.log(`Client ${peer.id} connected`)
  },
  onDisconnect: async (peer, reason) => {
    console.log(`Client ${peer.id} disconnected:`, reason)
  },
})

// wsHandler type is properly inferred from createHattipAdapter return type
// No more generic WebSocketAdapter type
```

## Migration Guide

### No Breaking Changes

This commit contains only improvements and bug fixes. Existing WebSocket routes will automatically benefit from:

- Better error handling and reporting
- Automatic defer queue flushing on abort
- Improved type inference
- Enhanced debugging information

### Recommended Updates

**Enhanced Error Handling:**

```ts
// Consider adding more specific error handling
export const improvedRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    try {
      return await processData(data)
    } catch (error) {
      // Errors are now automatically handled with proper formatting
      // But you can still add custom error handling if needed
      if (error instanceof CustomError) {
        throw new JSONResponse({ error: error.userMessage }, { status: 400 })
      }
      throw error // Will be handled by improved error system
    }
  }
)
```

**Better Resource Management:**

```ts
// Take advantage of improved defer queue flushing
export const resourceRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    const resources = await acquireMultipleResources()

    // All resources will be cleaned up even if request is aborted
    ctx.defer(async reason => {
      await Promise.all(resources.map(r => r.cleanup()))
      if (reason) {
        await logAbortReason(reason)
      }
    })

    return await processWithResources(resources, data)
  }
)
```

## Technical Details

### Error Utilities Centralization

```ts
// Previously duplicated code is now centralized in errorUtils.ts
export function isDecodeError(error: any): error is TransformDecodeError {
  return error instanceof TransformDecodeError
}

export function isDecodeCheckError(
  error: any
): error is TransformDecodeCheckError {
  return error instanceof TransformDecodeCheckError
}

export function firstLeafError(error: ValueError) {
  for (const suberror of flat(error.errors)) {
    if (suberror.errors) {
      return firstLeafError(suberror)
    }
    return suberror
  }
  return error
}
```

### AbortSignal Integration

```ts
// Defer queue is automatically flushed when AbortSignal fires
const flushDeferQueue = (reason?: any) => {
  if (deferQueue.length) {
    if (ctrl.signal.aborted) {
      reason = ctrl.signal.reason
    }
    Promise.allSettled(deferQueue.map(handler => handler(reason))).catch(
      console.error
    )
    deferQueue.length = 0
  }
}

const ctrl = new AbortController()
ctrl.signal.addEventListener('abort', flushDeferQueue)
```

### Type Inference Improvements

```ts
// Generic type parameter ensures proper return type inference
export function compileRoutes<TAdapter extends WebSocketAdapter>(
  routes: RouteList,
  createAdapter: (options: WebSocketAdapterOptions) => TAdapter
): TAdapter {
  // Implementation ensures return type matches createAdapter return type
  return createAdapter({
    // ... WebSocket adapter options
  })
}
```

## Related Changes

This commit builds upon:

- [WebSocket Support Improvements](./service-websocket-improvements.md) - Defer queue mechanism
- [Experimental WebSocket Support](./2025-02-17_a780569_experimental-websocket-support.md) - Base WebSocket functionality
- [Optional WebSocket Logic](./client-optional-websocket-logic.md) - Client-side improvements

## Files Modified

- `packages/service/src/websocket.ts` - Enhanced error handling and defer queue flushing
- `packages/service/src/errorUtils.ts` - Centralized error utilities (new file)
- `packages/service/src/compileRoutes.ts` - Removed duplicated error utilities

## Performance Impact

### Error Handling Performance

- **Better Error Processing**: More efficient error categorization and formatting
- **Stack Trace Optimization**: Stack traces only generated in development
- **Memory Efficiency**: Proper cleanup prevents memory leaks

### Resource Management

- **Automatic Cleanup**: Prevents resource leaks when connections are aborted
- **Efficient Defer Queue**: Optimized execution with Promise.allSettled
- **Signal Integration**: Leverages native AbortSignal for better performance

### Type System Benefits

- **Compile-Time Safety**: Better type inference reduces runtime errors
- **IDE Support**: Improved autocomplete and error detection
- **Bundle Optimization**: Better tree-shaking with proper types

## Future Enhancements

### Enhanced Error Reporting

- **Error Categorization**: More specific error types and codes
- **Error Aggregation**: Collect and report error patterns
- **Custom Error Handlers**: Allow custom error formatting per route

### Advanced Resource Management

- **Resource Timeouts**: Configurable timeouts for defer handlers
- **Resource Priorities**: Execute critical cleanup handlers first
- **Resource Monitoring**: Track resource usage and cleanup success

### Improved Type Safety

- **Route-Specific Types**: More granular typing for different route patterns
- **Middleware Integration**: Better type inference with middleware chains
- **Error Type Safety**: Typed error responses based on route definitions

## Debugging and Monitoring

### Development Mode Features

```ts
// Enhanced error information in development
if (process.env.NODE_ENV !== 'production') {
  console.error('WebSocket route error:', {
    route: route.name,
    error: error.message,
    stack: error.stack,
    params: params,
    timestamp: new Date().toISOString(),
  })
}
```

### Error Tracking Integration

```ts
// Easy integration with error tracking services
export const monitoredRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    ctx.defer(async reason => {
      if (reason) {
        // Send error to monitoring service
        await errorTracker.captureException(reason, {
          tags: { protocol: 'websocket', route: 'monitoredRoute' },
          extra: { data, timestamp: Date.now() },
        })
      }
    })

    return await processData(data)
  }
)
```

### Performance Monitoring

```ts
// Track defer queue performance
const flushDeferQueue = (reason?: any) => {
  const startTime = performance.now()

  if (deferQueue.length) {
    Promise.allSettled(deferQueue.map(handler => handler(reason)))
      .then(() => {
        const duration = performance.now() - startTime
        if (duration > 100) {
          // Log slow cleanup
          console.warn(`Slow defer queue flush: ${duration}ms`)
        }
      })
      .catch(console.error)

    deferQueue.length = 0
  }
}
```
