# Add `timeout` Request Option

**Commit:** `635332b`  
**Date:** March 18, 2025  
**Type:** Feature Enhancement

## Overview

This commit introduces a `timeout` option for HTTP requests, allowing clients to specify a maximum time to wait for response headers before aborting the request. This provides better control over request lifecycle and helps prevent hanging requests.

## New Features

### Request Timeout Option

Added `timeout` property to `RequestOptions` interface:

```ts
interface RequestOptions {
  // ... existing options
  
  /**
   * The request timeout (in seconds). If response headers are not received
   * within this time, the request will be aborted. Each retry has its own
   * timeout. Set to `0` to disable timeouts.
   *
   * The timeout error is a `DOMException` with the name "TimeoutError".
   *
   * @default 60
   */
  timeout?: number | undefined
}
```

### Usage Examples

#### Basic Timeout Usage

```ts
import { defineClient } from 'alien-rpc/client'

const client = defineClient(routes)

// Request with 30-second timeout
const result = await client.getData({ timeout: 30 })

// Request with 5-second timeout
const quickResult = await client.getQuickData({ timeout: 5 })

// Disable timeout for long-running requests
const longResult = await client.getLongRunningData({ timeout: 0 })
```

#### Error Handling

```ts
try {
  const result = await client.getData({ timeout: 10 })
  console.log('Success:', result)
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.log('Request timed out after 10 seconds')
  } else {
    console.log('Other error:', error)
  }
}
```

#### Per-Route Timeout Configuration

```ts
// Different timeouts for different operations
const userProfile = await client.getUserProfile({ timeout: 5 })     // Quick lookup
const analytics = await client.getAnalytics({ timeout: 30 })        // Medium operation
const report = await client.generateReport({ timeout: 120 })        // Long operation
const stream = await client.getDataStream({ timeout: 0 })           // No timeout for streams
```

## Implementation Details

### Timeout Mechanism

The timeout is implemented using `AbortController` and `setTimeout`:

```ts
if (timeout > 0) {
  const timeoutCtrl = new AbortController()
  const timeoutId = setTimeout(() => {
    timeoutCtrl.abort(new DOMException('Request timed out', 'TimeoutError'))
  }, timeout * 1000)

  response = await fetch(
    new Request(request, {
      signal: request.signal
        ? AbortSignal.any([timeoutCtrl.signal, request.signal])
        : timeoutCtrl.signal,
    })
  )
  clearTimeout(timeoutId)
}
```

### Key Features

1. **Per-Request Timeout**: Each request can have its own timeout value
2. **Retry-Aware**: Each retry attempt gets its own timeout period
3. **Signal Composition**: Combines timeout signal with existing abort signals using `AbortSignal.any()`
4. **Proper Cleanup**: Timeout is cleared when response headers are received
5. **Standard Error**: Uses `DOMException` with `TimeoutError` name for consistency

### Default Behavior

- **Default timeout**: 60 seconds
- **Disable timeout**: Set `timeout: 0`
- **Timeout unit**: Seconds (not milliseconds)
- **Timeout scope**: Applies only to receiving response headers, not the full response body

## Configuration Options

### Global Default Timeout

While this commit doesn't add global timeout configuration, you can implement it at the client level:

```ts
// Custom client wrapper with default timeout
function createClientWithTimeout(routes: any, defaultTimeout: number = 30) {
  const baseClient = defineClient(routes)
  
  return new Proxy(baseClient, {
    get(target, prop) {
      const original = target[prop]
      if (typeof original === 'function') {
        return function(options: any = {}) {
          // Apply default timeout if not specified
          if (options.timeout === undefined) {
            options.timeout = defaultTimeout
          }
          return original.call(this, options)
        }
      }
      return original
    }
  })
}

const client = createClientWithTimeout(routes, 45) // 45-second default
```

### Environment-Based Timeouts

```ts
// Adaptive timeout based on environment
const getDefaultTimeout = () => {
  if (process.env.NODE_ENV === 'development') {
    return 0 // No timeout during development
  }
  if (process.env.NODE_ENV === 'test') {
    return 5 // Short timeout for tests
  }
  return 60 // Production default
}

const result = await client.getData({ 
  timeout: getDefaultTimeout() 
})
```

## Use Cases

### API Health Checks

```ts
// Quick health check with short timeout
async function checkApiHealth() {
  try {
    await client.healthCheck({ timeout: 3 })
    return 'healthy'
  } catch (error) {
    if (error.name === 'TimeoutError') {
      return 'timeout'
    }
    return 'error'
  }
}
```

### Progressive Timeout Strategy

```ts
// Try with short timeout first, then longer
async function fetchWithFallback(id: string) {
  try {
    // Try quick request first
    return await client.getData({ id, timeout: 5 })
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.log('Quick request timed out, trying with longer timeout')
      // Fallback to longer timeout
      return await client.getData({ id, timeout: 30 })
    }
    throw error
  }
}
```

### Batch Operations

```ts
// Different timeouts for different batch sizes
async function processBatch(items: any[], batchSize: number) {
  const timeout = Math.min(60, batchSize * 2) // 2 seconds per item, max 60
  
  return await client.processBatch({ 
    items: items.slice(0, batchSize),
    timeout 
  })
}
```

## Integration with Existing Features

### Retry Mechanism

Timeouts work seamlessly with the existing retry system:

```ts
// Each retry gets its own timeout period
const result = await client.getData({
  timeout: 10,    // 10 seconds per attempt
  retry: 3        // Up to 3 retries
})
// Total possible time: 10s × 3 attempts = 30s maximum
```

### AbortController Integration

```ts
// Combine manual cancellation with timeout
const controller = new AbortController()

// Cancel after 30 seconds manually
setTimeout(() => controller.abort(), 30000)

const result = await client.getData({
  signal: controller.signal,
  timeout: 10  // Will timeout after 10s or when manually aborted
})
```

### WebSocket vs HTTP

Note that this timeout feature is specific to HTTP requests. WebSocket connections have their own timeout mechanisms:

- **HTTP requests**: Use `timeout` option (this feature)
- **WebSocket connections**: Use `wsIdleTimeout` client option
- **WebSocket requests**: Inherit connection-level timeout behavior

## Error Handling Best Practices

### Distinguishing Timeout Errors

```ts
function isTimeoutError(error: any): boolean {
  return error instanceof DOMException && error.name === 'TimeoutError'
}

try {
  const result = await client.getData({ timeout: 10 })
} catch (error) {
  if (isTimeoutError(error)) {
    // Handle timeout specifically
    console.log('Request timed out - server may be overloaded')
    // Maybe retry with longer timeout or show user-friendly message
  } else {
    // Handle other errors
    console.error('Request failed:', error)
  }
}
```

### Graceful Degradation

```ts
async function fetchWithGracefulDegradation(id: string) {
  const timeouts = [5, 15, 30] // Progressive timeouts
  
  for (const timeout of timeouts) {
    try {
      return await client.getData({ id, timeout })
    } catch (error) {
      if (isTimeoutError(error) && timeout < 30) {
        console.log(`Timeout after ${timeout}s, trying longer timeout`)
        continue
      }
      throw error
    }
  }
}
```

## Performance Considerations

### Memory Usage

- **Timeout timers**: Each request creates a `setTimeout` timer
- **AbortController**: Additional controller instance per request
- **Signal composition**: `AbortSignal.any()` creates composite signals
- **Cleanup**: Timers are properly cleared to prevent memory leaks

### Network Efficiency

- **Early termination**: Prevents hanging connections
- **Resource cleanup**: Aborted requests free up connection pools
- **Server load**: Reduces server resource usage from abandoned requests

## Migration Guide

This is a non-breaking change. Existing code continues to work with the default 60-second timeout.

### Opt-in Usage

```ts
// Before: No timeout control
const result = await client.getData()

// After: Optional timeout control
const result = await client.getData({ timeout: 30 })
```

### Disable Timeouts

If you prefer the old behavior (no timeouts), explicitly set `timeout: 0`:

```ts
// Disable timeout for specific requests
const result = await client.getData({ timeout: 0 })
```

## Related Files

- `packages/client/src/client.ts`: Core timeout implementation
- `packages/client/src/types.ts`: `RequestOptions` interface update
- `packages/client/src/protocols/http.ts`: HTTP-specific timeout handling

This enhancement provides developers with fine-grained control over request timeouts, improving application reliability and user experience by preventing indefinitely hanging requests.