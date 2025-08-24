# JsonStream#abort Method

**Commit:** bd33be631c3b5f08617e702e30618b993dc5e35d
**Author:** Alec Larson
**Date:** Fri Feb 21 17:46:06 2025 -0500
**Short SHA:** bd33be6

## Summary

This commit adds an `abort(reason?: any)` method to the `JsonStream` class, enabling graceful termination of streaming operations with an optional reason. This enhancement provides better error handling and resource cleanup for streaming routes.

## User Impact

**Audience:** Developers using `JsonStream` for streaming responses
**Breaking Change:** No - additive enhancement
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### New abort() Method

```ts
class JsonStream<T extends JSONCodable | undefined> {
  // Existing methods
  write(value: T): Promise<void>
  close(): Promise<void>

  // New method
  abort(reason?: any): Promise<void> // ← Added in this commit

  [Symbol.asyncIterator](): AsyncIterator<T>
}
```

### Method Signature

```ts
abort(reason?: any): Promise<void>
```

- **Parameters:** `reason` (optional) - Any value describing why the stream was aborted
- **Returns:** `Promise<void>` - Resolves when the stream has been aborted
- **Behavior:** Immediately terminates the stream and notifies consumers

## Implementation Details

### Internal Implementation

```ts
// In packages/service/src/stream.ts
export class JSONStream<T extends JSONCodable | undefined>
  implements AsyncIterable<T>
{
  #readable: ReadableStream<T>
  #writer: WritableStreamDefaultWriter<T>

  constructor() {
    const { readable, writable } = new TransformStream()
    this.#readable = readable
    this.#writer = writable.getWriter()
  }

  // Existing methods...
  write(value: T) {
    return this.#writer.write(value)
  }

  close() {
    return this.#writer.close()
  }

  // New abort method
  abort(reason?: any) {
    return this.#writer.abort(reason) // Delegates to WritableStreamDefaultWriter
  }

  [Symbol.asyncIterator]() {
    return this.#readable[Symbol.asyncIterator]()
  }
}
```

### Web Streams Integration

- **Delegates to `WritableStreamDefaultWriter#abort()`** - Uses standard Web Streams API
- **Immediate termination** - Stream stops accepting new writes immediately
- **Consumer notification** - Async iterators receive abort signal
- **Resource cleanup** - Underlying streams are properly cleaned up

## Usage Examples

### Basic Error Handling

```ts
import { route, JsonStream } from '@alien-rpc/service'

export const streamWithErrorHandling = route.get('/data/stream', async () => {
  const stream = new JsonStream<{ id: number; data: string }>()

  try {
    // Start streaming data
    for (let i = 0; i < 100; i++) {
      const data = await fetchDataItem(i)
      await stream.write({ id: i, data })
    }

    await stream.close()
  } catch (error) {
    // Abort the stream on error
    await stream.abort(error.message)
  }

  return stream
})
```

### Timeout-based Abortion

```ts
import { route, JsonStream } from '@alien-rpc/service'

export const streamWithTimeout = route.get('/data/timed', async () => {
  const stream = new JsonStream<{ timestamp: number; value: number }>()

  // Set up timeout
  const timeout = setTimeout(async () => {
    await stream.abort('Stream timeout after 30 seconds')
  }, 30000)

  try {
    // Stream data with periodic updates
    const interval = setInterval(async () => {
      try {
        await stream.write({
          timestamp: Date.now(),
          value: Math.random(),
        })
      } catch (error) {
        // Stream was aborted
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }, 1000)

    // Clean up after 25 seconds (before timeout)
    setTimeout(async () => {
      clearInterval(interval)
      clearTimeout(timeout)
      await stream.close()
    }, 25000)
  } catch (error) {
    clearTimeout(timeout)
    await stream.abort(error)
  }

  return stream
})
```

### Resource Cleanup with Abort

```ts
import { route, JsonStream } from '@alien-rpc/service'

export const streamWithResources = route.get('/database/stream', async () => {
  const stream = new JsonStream<{ id: string; record: any }>()
  let connection: DatabaseConnection | null = null

  try {
    // Acquire resources
    connection = await database.connect()
    const cursor = await connection.query('SELECT * FROM large_table')

    // Stream results
    for await (const record of cursor) {
      await stream.write({
        id: record.id,
        record: record.data,
      })
    }

    await stream.close()
  } catch (error) {
    // Clean up resources and abort stream
    if (connection) {
      await connection.close()
    }

    await stream.abort({
      error: error.message,
      timestamp: new Date().toISOString(),
      context: 'database_streaming',
    })
  }

  return stream
})
```

### Conditional Abortion

```ts
import { route, JsonStream } from '@alien-rpc/service'

export const streamWithConditions = route.get('/events/stream', async () => {
  const stream = new JsonStream<{ event: string; data: any }>()

  const eventSource = new EventSource('/internal/events')
  let eventCount = 0
  const maxEvents = 1000

  eventSource.onmessage = async event => {
    try {
      eventCount++

      // Check conditions before writing
      if (eventCount > maxEvents) {
        await stream.abort(`Maximum events reached: ${maxEvents}`)
        eventSource.close()
        return
      }

      const data = JSON.parse(event.data)

      // Abort on critical events
      if (data.type === 'system_shutdown') {
        await stream.abort('System shutdown initiated')
        eventSource.close()
        return
      }

      await stream.write({
        event: data.type,
        data: data.payload,
      })
    } catch (error) {
      // Stream was already aborted or closed
      eventSource.close()
    }
  }

  eventSource.onerror = async error => {
    await stream.abort('EventSource connection failed')
    eventSource.close()
  }

  return stream
})
```

### WebSocket Integration

```ts
import { route, JsonStream } from '@alien-rpc/service'
import { ws } from '@alien-rpc/service'

export const streamOverWebSocket = route.ws(
  async (topic: string, ctx: ws.RequestContext) => {
    const stream = new JsonStream<{ topic: string; message: any }>()

    // Set up WebSocket message handling
    const subscription = await pubsub.subscribe(topic)

    // Handle abort signal from client
    ctx.signal.addEventListener('abort', async () => {
      await stream.abort('Client disconnected')
      await subscription.unsubscribe()
    })

    // Clean up resources when request is aborted
    ctx.defer(async reason => {
      if (reason) {
        await stream.abort(`Request aborted: ${reason}`)
      }
      await subscription.unsubscribe()
    })

    // Stream messages
    subscription.onMessage = async message => {
      try {
        await stream.write({
          topic,
          message: message.data,
        })
      } catch (error) {
        // Stream was aborted
        await subscription.unsubscribe()
      }
    }

    subscription.onError = async error => {
      await stream.abort(error.message)
      await subscription.unsubscribe()
    }

    return stream
  }
)
```

## Client-Side Behavior

### Handling Aborted Streams

```ts
// Client code automatically handles aborted streams
const client = defineClient(routes)

try {
  for await (const item of client.streamWithErrorHandling()) {
    console.log('Received:', item)
  }
  console.log('Stream completed normally')
} catch (error) {
  // This catch block handles both:
  // 1. Streams that were aborted with stream.abort()
  // 2. Other errors during streaming
  console.error('Stream error:', error)
}
```

### Distinguishing Abort vs Other Errors

```ts
// Server-side: abort with structured reason
const stream = new JsonStream<any>()
await stream.abort({
  type: 'timeout',
  message: 'Stream timed out after 30 seconds',
  code: 'STREAM_TIMEOUT',
})

// Client-side: handle structured abort reasons
try {
  for await (const item of client.streamWithTimeout()) {
    console.log(item)
  }
} catch (error) {
  if (error.type === 'timeout') {
    console.log('Stream timed out:', error.message)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Comparison with close()

### close() vs abort()

```ts
const stream = new JsonStream<string>()

// Normal completion
await stream.write('data1')
await stream.write('data2')
await stream.close() // Graceful completion

// vs

// Error condition
await stream.write('data1')
// Something goes wrong...
await stream.abort('Database connection lost') // Immediate termination
```

### When to Use Each

#### Use close() when:

- **Normal completion** - All data has been successfully streamed
- **Graceful shutdown** - Operation completed as expected
- **Success scenarios** - No errors occurred

```ts
// Successful streaming
for (const item of dataSet) {
  await stream.write(item)
}
await stream.close() // Normal completion
```

#### Use abort() when:

- **Error conditions** - Something went wrong during streaming
- **Resource constraints** - Need to terminate due to limits
- **External signals** - Client disconnection, timeout, etc.
- **Immediate termination** - Cannot continue streaming

```ts
// Error during streaming
try {
  for (const item of dataSet) {
    await stream.write(item)
  }
  await stream.close()
} catch (error) {
  await stream.abort(error.message) // Error termination
}
```

## Error Propagation

### Stream Abortion Flow

```
1. Server calls stream.abort(reason)
   ↓
2. WritableStreamDefaultWriter.abort() is called
   ↓
3. TransformStream is aborted
   ↓
4. ReadableStream async iterator throws
   ↓
5. Client's for-await loop catches the error
   ↓
6. Error contains the abort reason
```

### Error Object Structure

```ts
// Server-side abort
await stream.abort({
  code: 'RESOURCE_EXHAUSTED',
  message: 'Server overloaded',
  retryAfter: 30,
})

// Client-side error object
try {
  for await (const item of client.streamData()) {
    // ...
  }
} catch (error) {
  // error contains the abort reason:
  console.log(error.code) // 'RESOURCE_EXHAUSTED'
  console.log(error.message) // 'Server overloaded'
  console.log(error.retryAfter) // 30
}
```

## Performance Considerations

### Memory Usage

- **Immediate cleanup** - Aborted streams release resources immediately
- **No buffering** - Pending writes are discarded, not buffered
- **Efficient termination** - Uses native Web Streams abort mechanism

### Network Impact

- **Connection closure** - HTTP connections close immediately on abort
- **WebSocket handling** - WebSocket connections can continue for other operations
- **Bandwidth savings** - No additional data transmitted after abort

### Resource Management

```ts
// Efficient resource cleanup pattern
const stream = new JsonStream<any>()
const resources: Resource[] = []

try {
  // Acquire resources
  const db = await database.connect()
  const cache = await redis.connect()
  resources.push(db, cache)

  // Stream data
  for await (const item of db.query('SELECT * FROM data')) {
    const enriched = await cache.enrich(item)
    await stream.write(enriched)
  }

  await stream.close()
} catch (error) {
  // Abort stream and clean up all resources
  await stream.abort(error.message)
} finally {
  // Ensure cleanup regardless of success/failure
  await Promise.all(resources.map(r => r.close()))
}
```

## Best Practices

### Structured Abort Reasons

```ts
// Good: Structured abort reason
await stream.abort({
  type: 'timeout',
  message: 'Operation timed out',
  code: 'STREAM_TIMEOUT',
  timestamp: new Date().toISOString(),
  context: { operation: 'data_fetch', duration: 30000 },
})

// Avoid: Generic string reasons
await stream.abort('error') // Not helpful for debugging
```

### Resource Cleanup

```ts
// Good: Comprehensive cleanup
const cleanup = async (reason?: string) => {
  await Promise.all([
    connection?.close(),
    subscription?.unsubscribe(),
    cache?.disconnect(),
  ])

  if (reason) {
    await stream.abort({ reason, timestamp: Date.now() })
  } else {
    await stream.close()
  }
}

// Use in try/catch and signal handlers
try {
  signal.addEventListener('abort', () => cleanup('client_abort'))
  // ... streaming logic
  await cleanup() // Normal completion
} catch (error) {
  await cleanup(error.message) // Error completion
}
```

### Error Context

```ts
// Good: Rich error context
const streamWithContext = async () => {
  const stream = new JsonStream<any>()
  const startTime = Date.now()
  let itemsProcessed = 0

  try {
    // ... streaming logic
    itemsProcessed++
  } catch (error) {
    await stream.abort({
      originalError: error.message,
      itemsProcessed,
      duration: Date.now() - startTime,
      stage: 'data_processing',
    })
  }

  return stream
}
```

### Timeout Patterns

```ts
// Good: Configurable timeout with cleanup
const createTimedStream = (timeoutMs: number = 30000) => {
  const stream = new JsonStream<any>()

  const timeoutId = setTimeout(async () => {
    await stream.abort({
      type: 'timeout',
      duration: timeoutMs,
      message: `Stream timed out after ${timeoutMs}ms`,
    })
  }, timeoutMs)

  // Clear timeout on normal completion
  const originalClose = stream.close.bind(stream)
  stream.close = async () => {
    clearTimeout(timeoutId)
    return originalClose()
  }

  return stream
}
```

## Integration with Other Features

### WebSocket Abort Handling

```ts
// WebSocket routes automatically handle stream abortion
export const wsStreamRoute = route.ws(
  async (params: any, ctx: ws.RequestContext) => {
    const stream = new JsonStream<any>()

    // Abort stream when WebSocket connection closes
    ctx.signal.addEventListener('abort', async () => {
      await stream.abort('WebSocket connection closed')
    })

    return stream
  }
)
```

### HTTP Request Cancellation

```ts
// HTTP routes handle client disconnection
export const httpStreamRoute = route.get('/stream', async ctx => {
  const stream = new JsonStream<any>()

  // Abort stream if client disconnects
  ctx.request.signal?.addEventListener('abort', async () => {
    await stream.abort('Client disconnected')
  })

  return stream
})
```

### Middleware Integration

```ts
// Middleware can abort streams based on conditions
const rateLimitMiddleware = handler => {
  return async (...args) => {
    const result = await handler(...args)

    if (result instanceof JsonStream) {
      // Check rate limits and abort if exceeded
      if (await isRateLimited()) {
        await result.abort({
          type: 'rate_limit',
          message: 'Rate limit exceeded',
          retryAfter: 60,
        })
      }
    }

    return result
  }
}
```

## Testing Considerations

### Unit Testing Abort Scenarios

```ts
// Test abort functionality
describe('JsonStream abort', () => {
  it('should abort stream with reason', async () => {
    const stream = new JsonStream<string>()

    // Start consuming stream
    const consumePromise = (async () => {
      const items = []
      for await (const item of stream) {
        items.push(item)
      }
      return items
    })()

    // Write some data
    await stream.write('item1')
    await stream.write('item2')

    // Abort with reason
    await stream.abort('test abort')

    // Consumption should throw
    await expect(consumePromise).rejects.toThrow('test abort')
  })
})
```

### Integration Testing

```ts
// Test client handling of aborted streams
it('should handle server stream abortion', async () => {
  const client = defineClient(routes)

  const items: any[] = []
  let error: any

  try {
    for await (const item of client.streamThatAborts()) {
      items.push(item)
    }
  } catch (e) {
    error = e
  }

  expect(items.length).toBeGreaterThan(0) // Some items received
  expect(error).toBeDefined() // Error was thrown
  expect(error.type).toBe('test_abort') // Correct abort reason
})
```

## Migration from Previous Versions

### Before abort() Method

```ts
// Old pattern: Only close() available
const stream = new JsonStream<any>()

try {
  // ... streaming logic
  await stream.close()
} catch (error) {
  // Could only close, not abort with reason
  await stream.close() // No way to signal error to client
}
```

### After abort() Method

```ts
// New pattern: Explicit error handling
const stream = new JsonStream<any>()

try {
  // ... streaming logic
  await stream.close() // Normal completion
} catch (error) {
  await stream.abort(error.message) // Error completion with reason
}
```

### Backward Compatibility

- **No breaking changes** - Existing code using `close()` continues to work
- **Additive enhancement** - `abort()` is a new method, doesn't affect existing usage
- **Optional adoption** - Teams can adopt `abort()` gradually

## Related Changes

### JsonStream Evolution

- **JsonStream class** (commit d9e2e94) - Initial implementation with `write()` and `close()`
- **JsonStream#abort method** (commit bd33be6) - This commit adds `abort()` method
- **JSON sequence error handling** - Integration with error forwarding in streams

### WebSocket Integration

- **WebSocket support** (commit a780569) - WebSocket protocol implementation
- **WebSocket handler improvements** (commit 110075b) - Enhanced error handling
- **Abort signal handling** - Integration with WebSocket request cancellation

### Future Enhancements

- **Abort reason standardization** - Standard abort reason formats
- **Retry mechanisms** - Automatic retry on certain abort conditions
- **Abort callbacks** - Hooks for custom cleanup logic
- **Abort metrics** - Built-in monitoring of abort patterns

## References

**Files Modified:**

- `packages/service/src/stream.ts` - Added `abort(reason?: any)` method to `JsonStream` class

**Related Documentation:**

- [JsonStream Class](./service-jsonstream-class.md) - Initial JsonStream implementation
- [JSON Sequence Error Handling](./2024-12-19_340045e_json-seq-error-forwarding.md) - Error handling in streams
- [WebSocket Support](./2025-02-17_a780569_experimental-websocket-support.md) - WebSocket streaming
- [WebSocket Handler Improvements](./service-websocket-handler-improvements.md) - Enhanced WebSocket error handling

**Web Standards:**

- [WritableStreamDefaultWriter.abort()](https://developer.mozilla.org/en-US/docs/Web/API/WritableStreamDefaultWriter/abort) - Underlying Web Streams API
- [JSON Text Sequences (RFC 7464)](https://www.rfc-editor.org/rfc/rfc7464.html) - Streaming JSON format
- [AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) - Request cancellation patterns

**Best Practices:**

- Use `abort()` for error conditions and `close()` for normal completion
- Provide structured abort reasons for better debugging
- Clean up resources in both success and abort scenarios
- Handle abort signals from clients (WebSocket, HTTP cancellation)
- Test both normal and abort scenarios in your streaming routes
