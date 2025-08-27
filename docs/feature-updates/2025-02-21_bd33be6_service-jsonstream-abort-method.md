# JsonStream#abort Method

**Commit:** bd33be631c3b5f08617e702e30618b993dc5e35d
**Author:** Alec Larson
**Date:** Fri Feb 21 17:46:06 2025 -0500
**Short SHA:** bd33be6

## Summary

Added `abort(reason?: any)` method to `JsonStream` class for graceful termination of streaming operations with optional error reasons.

## User-Visible Changes

- **New abort method**: `JsonStream#abort(reason?: any)` for immediate stream termination with optional reason
- **Enhanced error handling**: Streams can now be aborted with structured error information
- **Better resource cleanup**: Immediate termination and cleanup when errors occur
- **Client error propagation**: Abort reasons are propagated to client-side error handling
- **Non-breaking addition**: Existing `write()` and `close()` methods unchanged
- **Web Streams integration**: Uses standard `WritableStreamDefaultWriter#abort()` underneath
- **Flexible abort reasons**: Supports any value type (string, object, etc.) as abort reason
- **Immediate termination**: Stream stops accepting writes and notifies consumers instantly

## Examples

### New abort() Method

```ts
class JsonStream<T extends JSONCodable | undefined> {
  write(value: T): Promise<void>
  close(): Promise<void>
  abort(reason?: any): Promise<void> // ← New method
}
```

### Basic Usage

```ts
// Error handling with abort
const stream = new JsonStream<any>()
try {
  await stream.write({ data: 'value' })
  await stream.close() // Normal completion
} catch (error) {
  await stream.abort(error.message) // Error termination
}
```

### Structured Abort Reasons

```ts
// Abort with detailed error information
await stream.abort({
  type: 'timeout',
  message: 'Stream timed out after 30 seconds',
  code: 'STREAM_TIMEOUT'
})
```

## Config/Flags

- No configuration changes required
- Method available on all `JsonStream` instances
- Optional `reason` parameter for abort context

## Breaking/Migration

- **Non-breaking**: Additive enhancement to existing `JsonStream` class
- **No migration required**: Existing `write()` and `close()` usage unchanged
- **Backward compatible**: All existing streaming code continues to work

## Tags

`streaming` `error-handling` `jsonstream` `abort` `resource-cleanup`

## Evidence

**Modified Files:**
- `packages/service/src/stream.ts` - Added `abort(reason?: any)` method to `JsonStream` class

**Implementation Details:**
- Delegates to `WritableStreamDefaultWriter#abort()` for standard Web Streams behavior
- Immediate stream termination and consumer notification
- Supports any value type as abort reason (string, object, etc.)
- Integrates with existing error propagation to client-side

**Usage Patterns:**
- Error conditions: `await stream.abort(error.message)`
- Structured reasons: `await stream.abort({ type: 'timeout', code: 'STREAM_TIMEOUT' })`
- Resource cleanup: Immediate termination with proper cleanup
- Client handling: Abort reasons propagated to client error handling
