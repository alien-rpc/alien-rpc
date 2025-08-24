# JsonStream Class

**Commit:** `d9e2e94` - feat(service): add `JsonStream` class

## Overview

The `JsonStream` class (also known as `JSONStream`) provides an easy way to push JSON-serializable values to clients over long-lived HTTP requests or WebSocket connections. This class enables real-time streaming of data from alien-rpc routes.

## What Changed

### New JsonStream Class

A new streaming utility class was added to `@alien-rpc/service`:

```typescript
export class JSONStream<T extends JSONCodable | undefined>
  implements AsyncIterable<T>
{
  write(value: T): Promise<void>
  close(): Promise<void>
  abort(reason?: any): Promise<void>
  [Symbol.asyncIterator](): AsyncIterator<T>
}
```

### Key Features

- **Type-safe streaming**: Generic type parameter ensures type safety for streamed values
- **JSON-serializable values**: Only accepts `JSONCodable` types (strings, numbers, objects, arrays, etc.)
- **Async iterable**: Implements `AsyncIterable<T>` for easy consumption
- **Built on Web Streams**: Uses `TransformStream` internally for efficient streaming
- **Route integration**: Can be returned directly from alien-rpc route handlers

## API Reference

### Constructor

```typescript
const stream = new JSONStream<T>()
```

Creates a new JsonStream instance using a `TransformStream` internally.

### Methods

#### `write(value: T): Promise<void>`

Pushes a JSON-serializable value to the stream.

```typescript
const stream = new JSONStream<{ id: number; message: string }>()

await stream.write({ id: 1, message: 'Hello' })
await stream.write({ id: 2, message: 'World' })
```

#### `close(): Promise<void>`

Closes the stream, indicating no more values will be written.

```typescript
await stream.close()
```

#### `abort(reason?: any): Promise<void>`

Aborts the stream with an optional reason. Added in a later commit (`bd33be6`).

```typescript
await stream.abort('Connection lost')
```

#### `[Symbol.asyncIterator](): AsyncIterator<T>`

Makes the stream async iterable, allowing consumption with `for await...of`.

```typescript
for await (const value of stream) {
  console.log(value)
}
```

## Usage Examples

### Basic Streaming Route

```typescript
import { route, JSONStream } from '@alien-rpc/service'

export const streamMessages = route.get('/messages/stream', async () => {
  const stream = new JSONStream<{ id: number; text: string; timestamp: Date }>()

  // Start streaming messages
  setTimeout(async () => {
    await stream.write({ id: 1, text: 'First message', timestamp: new Date() })
    await stream.write({ id: 2, text: 'Second message', timestamp: new Date() })
    await stream.close()
  }, 100)

  return stream
})
```

### Real-time Data Streaming

```typescript
import { route, JSONStream } from '@alien-rpc/service'

export const streamLiveData = route.get('/data/live', async () => {
  const stream = new JSONStream<{ value: number; timestamp: number }>()

  // Simulate real-time data
  const interval = setInterval(async () => {
    try {
      await stream.write({
        value: Math.random() * 100,
        timestamp: Date.now(),
      })
    } catch (error) {
      clearInterval(interval)
    }
  }, 1000)

  // Clean up after 10 seconds
  setTimeout(async () => {
    clearInterval(interval)
    await stream.close()
  }, 10000)

  return stream
})
```

### Error Handling with Abort

```typescript
import { route, JSONStream } from '@alien-rpc/service'

export const streamWithErrorHandling = route.get('/stream/safe', async () => {
  const stream = new JSONStream<{ data: string }>()

  try {
    // Simulate some async work
    const data = await fetchDataFromDatabase()

    for (const item of data) {
      await stream.write({ data: item })
    }

    await stream.close()
  } catch (error) {
    // Abort the stream on error
    await stream.abort(error.message)
  }

  return stream
})
```

### WebSocket Integration

```typescript
import { route, JSONStream } from '@alien-rpc/service'

export const streamOverWebSocket = route.get('/ws/stream', async () => {
  const stream = new JSONStream<{ event: string; data: any }>()

  // This stream can be consumed over WebSocket connections
  // The alien-rpc WebSocket handler will automatically handle the streaming

  return stream
})
```

## Client-Side Consumption

On the client side, JsonStream routes are automatically handled as streaming responses:

```typescript
// Generated client code handles streaming automatically
for await (const message of client.streamMessages()) {
  console.log('Received:', message)
}

// Or collect all values
const messages = await client.streamMessages().toArray()
```

## Technical Details

### Internal Implementation

- Uses Web Streams API (`TransformStream`) for efficient streaming
- Implements `AsyncIterable<T>` interface for standard async iteration
- Maintains type safety through generic type parameter
- Integrates seamlessly with alien-rpc's JSON sequence responder

### JSON Text Sequence Format

When used in HTTP routes, JsonStream values are serialized using the [JSON Text Sequence](https://www.rfc-editor.org/rfc/rfc7464.html) format:

- Each value is prefixed with ASCII Record Separator (`\x1E`)
- Each value is suffixed with ASCII Line Feed (`\x0A`)
- Content-Type is set to `application/octet-stream` with `X-Content-Type: application/json-seq`

### Memory Efficiency

- Values are streamed as they're written, not buffered in memory
- Backpressure is handled automatically by the underlying `TransformStream`
- Suitable for large datasets and long-running streams

## Benefits

### Developer Experience

- **Type Safety**: Full TypeScript support with generic types
- **Simple API**: Easy to use with familiar async/await patterns
- **Flexible**: Works with HTTP requests and WebSocket connections
- **Standard Compliant**: Uses Web Streams API and JSON Text Sequence RFC

### Performance

- **Memory Efficient**: Streams data without buffering entire response
- **Real-time**: Low latency for live data streaming
- **Scalable**: Handles multiple concurrent streams efficiently

### Integration

- **Route Compatible**: Can be returned directly from route handlers
- **Client Transparent**: Automatically handled by generated client code
- **Protocol Agnostic**: Works over HTTP and WebSocket protocols

## Migration Notes

- **New Feature**: No breaking changes, purely additive
- **Optional**: Existing routes continue to work unchanged
- **Import**: Available from `@alien-rpc/service` package

## Related Features

- See [JSON Sequence Responder](../service/json-sequence.md) for HTTP streaming details
- See [WebSocket Support](../websocket-support.md) for WebSocket streaming
- See [Async Generators](../service/async-generators.md) for alternative streaming approach
- See [JsonStream#abort Method](./service-jsonstream-abort.md) for error handling
