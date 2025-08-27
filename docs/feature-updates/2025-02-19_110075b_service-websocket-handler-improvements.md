# WebSocket Handler Improvements and Fixes

**Commit:** 110075bd109833c163e5049516edc61251668582
**Author:** Alec Larson
**Date:** 2025-02-19
**Short SHA:** 110075b

## Summary

Critical improvements to WebSocket handlers bringing error handling parity with HTTP handlers, automatic resource cleanup, and enhanced type inference.

## User-Visible Changes

- **Enhanced TypeBox validation errors**: WebSocket handlers now provide detailed validation error messages with path and value information, matching HTTP handler behavior
- **Automatic defer queue flushing**: Cleanup handlers are automatically executed when requests are aborted via AbortSignal, preventing resource leaks
- **Improved error responses**: Stack traces in development, structured error codes, and proper Response object handling
- **Better type inference**: `ws.compileRoutes` now properly infers return types from the `createAdapter` function
- **Centralized error utilities**: Shared error handling logic between HTTP and WebSocket handlers for consistency
- **Enhanced debugging**: Development-mode error logging with route context and timing information

## Examples

### Enhanced Validation Error Handling
```ts
// TypeBox validation errors now include detailed information
export const createUserRoute = route.ws(
  async (userData: { name: string; email: string; age: number }, ctx) => {
    return await db.users.create(userData)
  }
)

// Client receives detailed validation error:
// {
//   id: "req-1",
//   error: {
//     code: 400,
//     message: "Expected number",
//     data: { path: "/age", value: "twenty-five" }
//   }
// }
```

### Automatic Resource Cleanup
```ts
export const streamRoute = route.ws(async function* (query, ctx) {
  const connection = await database.connect()
  const subscription = await pubsub.subscribe(query)

  // Both resources cleaned up automatically on abort
  ctx.defer(async reason => {
    await subscription.unsubscribe()
    await connection.close()
  })

  for await (const data of subscription) {
    yield { timestamp: Date.now(), data }
  }
})
```

### Improved Type Inference
```ts
// Return type properly inferred from createAdapter
const wsHandler = ws.compileRoutes(routes, createHattipAdapter)
// wsHandler type is now HattipAdapter, not generic WebSocketAdapter
```

## Config/Flags

### Error Handling Options
- **Development mode**: Stack traces included in error responses when `NODE_ENV !== 'production'`
- **TypeBox validation**: Automatic detailed error messages with path and value information
- **Response objects**: Support for throwing custom `Response` objects with status codes

### Defer Queue Configuration
- **AbortSignal integration**: Automatic cleanup handler execution on request abort
- **Promise.allSettled**: All defer handlers executed even if some fail
- **Reason propagation**: Abort reasons passed to cleanup handlers

### Type Inference
- **Generic constraints**: `TAdapter extends WebSocketAdapter` for proper return type inference
- **Route definitions**: Proper typing for `importRoute<RouteDefinition>` calls

## Breaking/Migration

**No breaking changes** - All improvements are backward compatible. Existing WebSocket routes automatically benefit from:
- Enhanced error handling and reporting
- Automatic defer queue flushing on abort
- Improved type inference
- Enhanced debugging information

## Tags

`websocket` `error-handling` `validation` `typebox` `defer-queue` `abort-signal` `type-inference` `resource-cleanup` `debugging` `reliability`

## Evidence

**Modified Files:**
- `packages/service/src/websocket.ts` - Enhanced error handling and defer queue flushing
- `packages/service/src/errorUtils.ts` - Centralized error utilities (new file)
- `packages/service/src/compileRoutes.ts` - Removed duplicated error utilities

**Related Features:**
- WebSocket Support Improvements - Defer queue mechanism
- Experimental WebSocket Support - Base WebSocket functionality
- Optional WebSocket Logic - Client-side improvements
