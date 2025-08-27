# JsonStream Class

**Commit:** `d9e2e94` - feat(service): add `JsonStream` class

## Summary

The `JsonStream` class provides type-safe streaming of JSON-serializable values to clients over HTTP requests or WebSocket connections, enabling real-time data streaming from alien-rpc routes.

## User-Visible Changes

- **New JsonStream Class**: Type-safe streaming utility for JSON-serializable values
- **AsyncIterable Interface**: Implements `AsyncIterable<T>` for easy consumption with `for await...of`
- **Route Integration**: Can be returned directly from route handlers
- **Web Streams Based**: Built on `TransformStream` for efficient streaming
- **JSON Text Sequence**: Uses RFC 7464 format for HTTP streaming
- **Memory Efficient**: Streams data without buffering entire response
- **Protocol Agnostic**: Works over both HTTP and WebSocket protocols
- **Type Safety**: Full TypeScript support with generic type parameters

## Examples

**Basic Streaming Route:**
```typescript
import { route, JSONStream } from '@alien-rpc/service'

export const streamMessages = route.get('/messages/stream', async () => {
  const stream = new JSONStream<{ id: number; text: string; timestamp: Date }>()

  setTimeout(async () => {
    await stream.write({ id: 1, text: 'First message', timestamp: new Date() })
    await stream.write({ id: 2, text: 'Second message', timestamp: new Date() })
    await stream.close()
  }, 100)

  return stream
})
```

**Real-time Data Streaming:**
```typescript
export const streamLiveData = route.get('/data/live', async () => {
  const stream = new JSONStream<{ value: number; timestamp: number }>()

  const interval = setInterval(async () => {
    await stream.write({ value: Math.random() * 100, timestamp: Date.now() })
  }, 1000)

  setTimeout(async () => {
    clearInterval(interval)
    await stream.close()
  }, 10000)

  return stream
})
```

**Error Handling:**
```typescript
export const streamSafe = route.get('/stream/safe', async () => {
  const stream = new JSONStream<{ data: string }>()

  try {
    const data = await fetchDataFromDatabase()
    for (const item of data) {
      await stream.write({ data: item })
    }
    await stream.close()
  } catch (error) {
    await stream.abort(error.message)
  }

  return stream
})
```

**Client-Side Consumption:**
```typescript
// Generated client handles streaming automatically
for await (const message of client.streamMessages()) {
  console.log('Received:', message)
}

// Or collect all values
const messages = await client.streamMessages().toArray()
```

## Config/Flags

**JsonStream API:**
- `new JSONStream<T>()` - Create new stream instance with type parameter
- `write(value: T)` - Push JSON-serializable value to stream
- `close()` - Close stream (no more values)
- `abort(reason?)` - Abort stream with optional reason
- `[Symbol.asyncIterator]()` - Enable `for await...of` consumption

**JSON Text Sequence Format (HTTP):**
- Values prefixed with ASCII Record Separator (`\x1E`)
- Values suffixed with ASCII Line Feed (`\x0A`)
- Content-Type: `application/octet-stream` with `X-Content-Type: application/json-seq`

## Breaking/Migration

**Breaking Changes:** None - purely additive feature

**Migration Steps:** No migration required - import from `@alien-rpc/service`

## Tags

`jsonstream` `streaming` `real-time` `web-streams` `async-iterable` `json-text-sequence` `type-safety`

## Evidence

**New Class Added:**
- `JSONStream<T>` class in `@alien-rpc/service` package
- Built on Web Streams API (`TransformStream`)
- Implements `AsyncIterable<T>` interface
- Integrates with alien-rpc's JSON sequence responder

**Technical Implementation:**
- Uses RFC 7464 JSON Text Sequence format for HTTP
- Memory efficient streaming without buffering
- Automatic backpressure handling
- Compatible with both HTTP and WebSocket protocols

**Related Features:**
- JSON Sequence Responder for HTTP streaming
- WebSocket Support for real-time streaming
- Async Generators as alternative streaming approach
