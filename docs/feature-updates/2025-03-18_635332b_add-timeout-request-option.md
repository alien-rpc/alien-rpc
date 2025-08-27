# Add `timeout` Request Option

**Commit:** 635332b  
**Date:** March 18, 2025  
**Type:** Enhancement  
**Breaking Change:** ❌ No

## Summary

Adds `timeout` option for HTTP requests, allowing clients to specify maximum time to wait for response headers before aborting the request. Provides better control over request lifecycle and prevents hanging requests with configurable per-request timeouts.

## User-Visible Changes

- **Request timeout option**: New `timeout` property in `RequestOptions` (default: 60 seconds)
- **Per-request control**: Each request can have its own timeout value
- **Retry-aware**: Each retry attempt gets its own timeout period
- **Disable option**: Set `timeout: 0` to disable timeouts
- **Standard errors**: Uses `DOMException` with `TimeoutError` name
- **Signal composition**: Combines with existing `AbortController` signals

## Examples

### Basic Usage
```ts
// Request with 30-second timeout
const result = await client.getData({ timeout: 30 })

// Quick request with 5-second timeout
const quickResult = await client.getQuickData({ timeout: 5 })

// Disable timeout for long-running requests
const longResult = await client.getLongRunningData({ timeout: 0 })
```

### Error Handling
```ts
try {
  const result = await client.getData({ timeout: 10 })
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Request timed out after 10 seconds')
  } else {
    console.log('Other error:', error)
  }
}
```

### Progressive Timeout Strategy
```ts
async function fetchWithFallback(id: string) {
  try {
    // Try quick request first
    return await client.getData({ id, timeout: 5 })
  } catch (error) {
    if (error.name === 'TimeoutError') {
      // Fallback to longer timeout
      return await client.getData({ id, timeout: 30 })
    }
    throw error
  }
}
```

## Config/Flags

- `timeout`: Request timeout in seconds (default: 60, set to 0 to disable)
- Works with existing `retry` option (each retry gets its own timeout)
- Integrates with `AbortController` signals using `AbortSignal.any()`

## Breaking/Migration

**Breaking:** No - Fully backward compatible with default 60-second timeout

**Migration:** None required - existing code continues to work unchanged

## Tags

`http` `timeout` `request-options` `abort-controller` `client` `reliability`

## Evidence

- **Implementation**: Uses `AbortController` and `setTimeout` for timeout mechanism
- **Scope**: Applies only to receiving response headers, not full response body
- **Memory management**: Timers properly cleared to prevent memory leaks
- **Error type**: `DOMException` with `TimeoutError` name for consistency
- **Files modified**: `packages/client/src/client.ts`, `packages/client/src/types.ts`, `packages/client/src/protocols/http.ts`