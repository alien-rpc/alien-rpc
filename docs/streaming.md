# Streaming

Alien RPC provides powerful streaming capabilities for real-time data communication, including JSON streaming for HTTP responses and WebSocket support for bidirectional communication.

## JSON Streaming

### Overview

JSON streaming allows you to send data to clients incrementally, which is perfect for:
- Large datasets that would be expensive to load into memory
- Real-time data feeds
- Progress updates for long-running operations
- Server-sent events

### Basic JSON Streaming

```typescript
import { route } from '@alien-rpc/service'

export const streamData = route.get('/stream', async function* () {
  for (let i = 0; i < 100; i++) {
    yield { count: i, timestamp: Date.now() }
    // Optional: add delay between items
    await new Promise(resolve => setTimeout(resolve, 100))
  }
})
```

### Streaming Database Results

```typescript
import { route } from '@alien-rpc/service'
import { db } from './database'

export const streamUsers = route.get('/users/stream', async function* () {
  const cursor = db.users.find().cursor()
  
  for await (const user of cursor) {
    yield {
      id: user.id,
      name: user.name,
      email: user.email
    }
  }
})
```

### Client-Side JSON Streaming

The generated client provides seamless streaming support:

```typescript
import { createClient } from './generated/client'

const client = createClient({
  prefixUrl: 'http://localhost:3000'
})

// Basic streaming
for await (const item of client.streamData()) {
  console.log('Received:', item)
}

// With error handling
try {
  for await (const user of client.streamUsers()) {
    console.log('User:', user.name)
  }
} catch (error) {
  console.error('Stream error:', error)
}
```

### Stream Error Handling

```typescript
export const streamWithErrors = route.get('/stream-safe', async function* () {
  try {
    for (let i = 0; i < 10; i++) {
      if (i === 5) {
        throw new Error('Simulated error')
      }
      yield { value: i }
    }
  } catch (error) {
    // Handle errors gracefully
    yield { error: error.message }
  }
})
```

### Progress Tracking

```typescript
export const processWithProgress = route.post('/process', 
  async function* (data: { items: string[] }) {
    const total = data.items.length
    
    for (let i = 0; i < total; i++) {
      const item = data.items[i]
      
      // Process the item
      const result = await processItem(item)
      
      yield {
        progress: {
          current: i + 1,
          total,
          percentage: Math.round(((i + 1) / total) * 100)
        },
        result
      }
    }
  }
)
```

## WebSocket Support

### Overview

Alien RPC provides experimental WebSocket support for real-time bidirectional communication. WebSocket routes support three messaging patterns:

1. **Notifications** - One-way messages (fire and forget)
2. **Requests** - Request-response pattern with acknowledgment
3. **Subscriptions** - Server-initiated streaming to clients

### Basic WebSocket Route

```typescript
import { route } from '@alien-rpc/service'

export const chatSocket = route.ws('/chat', {
  // Handle client notifications
  async onMessage(message: { text: string, user: string }) {
    console.log(`${message.user}: ${message.text}`)
    // Broadcast to other clients (implementation depends on your setup)
  },
  
  // Handle client requests (with response)
  async onRequest(request: { type: 'join', room: string }) {
    if (request.type === 'join') {
      // Join room logic
      return { success: true, room: request.room }
    }
  },
  
  // Server-initiated subscriptions
  async onSubscribe(subscription: { type: 'room-updates', room: string }) {
    if (subscription.type === 'room-updates') {
      // Return an async generator for streaming updates
      return async function* () {
        while (true) {
          const update = await getRoomUpdate(subscription.room)
          yield update
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
  }
})
```

### WebSocket Client Usage

```typescript
import { createClient } from './generated/client'

const client = createClient({
  prefixUrl: 'http://localhost:3000',
  websocket: {
    // Optional WebSocket configuration
    reconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000
  }
})

// Connect to WebSocket
const ws = await client.chatSocket()

// Send notifications (fire and forget)
ws.notify({ text: 'Hello everyone!', user: 'Alice' })

// Send requests (with response)
const response = await ws.request({ type: 'join', room: 'general' })
console.log('Join response:', response)

// Subscribe to server updates
for await (const update of ws.subscribe({ type: 'room-updates', room: 'general' })) {
  console.log('Room update:', update)
}
```

### WebSocket Connection Management

```typescript
// Manual connection control
const ws = await client.chatSocket()

// Check connection status
console.log('Connected:', ws.connected)

// Handle connection events
ws.on('connect', () => console.log('Connected'))
ws.on('disconnect', () => console.log('Disconnected'))
ws.on('error', (error) => console.error('WebSocket error:', error))

// Close connection
ws.close()
```

### WebSocket Middleware

WebSocket routes support middleware for authentication and other cross-cutting concerns:

```typescript
import { route } from '@alien-rpc/service'

// Authentication middleware
const authenticateWS = async (context: any) => {
  const token = context.headers.authorization
  if (!token) {
    throw new Error('Authentication required')
  }
  // Verify token and add user to context
  context.user = await verifyToken(token)
}

export const secureChat = route.ws('/secure-chat', {
  middleware: [authenticateWS],
  
  async onMessage(message: { text: string }, context) {
    // Access authenticated user
    console.log(`${context.user.name}: ${message.text}`)
  }
})
```

## Advanced Streaming Patterns

### Conditional Streaming

```typescript
export const conditionalStream = route.get('/stream/:type', 
  async function* (args: { type: 'fast' | 'slow' }) {
    const delay = args.type === 'fast' ? 50 : 500
    
    for (let i = 0; i < 20; i++) {
      yield { 
        index: i, 
        type: args.type,
        timestamp: Date.now() 
      }
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
)
```

### Stream Transformation

```typescript
export const transformedStream = route.get('/transform', async function* () {
  const rawData = getRawDataStream() // Returns AsyncIterable
  
  for await (const item of rawData) {
    // Transform each item before yielding
    yield {
      ...item,
      processed: true,
      processedAt: Date.now()
    }
  }
})
```

### Multiplexed Streams

```typescript
export const multiplexedStream = route.get('/multiplex', async function* () {
  const stream1 = getStream1()
  const stream2 = getStream2()
  
  // Merge multiple streams
  const merged = mergeStreams(stream1, stream2)
  
  for await (const item of merged) {
    yield {
      source: item.source,
      data: item.data,
      timestamp: Date.now()
    }
  }
})
```

## Performance Considerations

### Backpressure Handling

```typescript
export const backpressureStream = route.get('/backpressure', async function* () {
  const queue = []
  let processing = false
  
  while (true) {
    // Check if client can handle more data
    if (queue.length > 100) {
      // Implement backpressure strategy
      await new Promise(resolve => setTimeout(resolve, 100))
      continue
    }
    
    const item = await getNextItem()
    if (!item) break
    
    yield item
  }
})
```

### Memory Management

```typescript
export const memoryEfficientStream = route.get('/efficient', async function* () {
  // Process data in chunks to avoid memory issues
  const chunkSize = 1000
  let offset = 0
  
  while (true) {
    const chunk = await db.getData({ limit: chunkSize, offset })
    
    if (chunk.length === 0) break
    
    for (const item of chunk) {
      yield item
    }
    
    offset += chunkSize
    
    // Optional: garbage collection hint
    if (global.gc && offset % 10000 === 0) {
      global.gc()
    }
  }
})
```

## Error Handling

### Stream Error Recovery

```typescript
export const resilientStream = route.get('/resilient', async function* () {
  let retries = 0
  const maxRetries = 3
  
  while (retries < maxRetries) {
    try {
      const data = await fetchExternalData()
      
      for (const item of data) {
        yield item
      }
      
      break // Success, exit retry loop
    } catch (error) {
      retries++
      
      if (retries >= maxRetries) {
        yield { error: 'Max retries exceeded', details: error.message }
        break
      }
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, retries) * 1000)
      )
    }
  }
})
```

### Client Error Handling

```typescript
// Robust client streaming with error recovery
async function consumeStreamWithRetry() {
  let retries = 0
  const maxRetries = 3
  
  while (retries < maxRetries) {
    try {
      for await (const item of client.resilientStream()) {
        if ('error' in item) {
          console.error('Stream error:', item.error)
          break
        }
        
        console.log('Received:', item)
      }
      
      break // Success
    } catch (error) {
      retries++
      console.error(`Stream failed (attempt ${retries}):`, error)
      
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * retries))
      }
    }
  }
}
```

## Testing Streaming Routes

### Testing JSON Streams

```typescript
import { describe, it, expect } from 'vitest'
import { createTestClient } from './test-utils'

describe('Streaming Routes', () => {
  it('should stream data correctly', async () => {
    const client = createTestClient()
    const items = []
    
    for await (const item of client.streamData()) {
      items.push(item)
      if (items.length >= 5) break // Test first 5 items
    }
    
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveProperty('count', 0)
    expect(items[4]).toHaveProperty('count', 4)
  })
})
```

### Testing WebSocket Routes

```typescript
import { describe, it, expect } from 'vitest'
import { createTestClient } from './test-utils'

describe('WebSocket Routes', () => {
  it('should handle notifications', async () => {
    const client = createTestClient()
    const ws = await client.chatSocket()
    
    // Send notification
    ws.notify({ text: 'test message', user: 'testuser' })
    
    // Verify message was processed (implementation specific)
    // This would depend on your testing setup
  })
  
  it('should handle requests', async () => {
    const client = createTestClient()
    const ws = await client.chatSocket()
    
    const response = await ws.request({ type: 'join', room: 'test' })
    
    expect(response).toEqual({ success: true, room: 'test' })
  })
})
```

## Best Practices

### JSON Streaming

1. **Use appropriate chunk sizes** - Balance between memory usage and network efficiency
2. **Handle errors gracefully** - Don't let one bad item break the entire stream
3. **Implement backpressure** - Monitor client consumption rate
4. **Add progress indicators** - Help clients understand stream progress
5. **Use TypeScript types** - Ensure type safety for streamed data

### WebSocket Communication

1. **Implement reconnection logic** - Handle network interruptions gracefully
2. **Use appropriate message types** - Choose between notifications, requests, and subscriptions
3. **Handle connection lifecycle** - Properly clean up resources on disconnect
4. **Implement authentication** - Secure WebSocket connections appropriately
5. **Monitor connection health** - Use ping/pong or heartbeat mechanisms

### Performance

1. **Monitor memory usage** - Especially important for long-running streams
2. **Implement rate limiting** - Prevent overwhelming clients or servers
3. **Use compression** - For large payloads, consider compression
4. **Profile your streams** - Identify bottlenecks in data processing
5. **Consider caching** - Cache frequently accessed data when appropriate

### Error Handling

1. **Fail gracefully** - Provide meaningful error messages
2. **Implement retry logic** - Both client and server side
3. **Log appropriately** - Help with debugging without overwhelming logs
4. **Use circuit breakers** - Prevent cascading failures
5. **Test error scenarios** - Ensure your error handling actually works

Streaming in Alien RPC provides powerful capabilities for real-time applications. Whether you're building a chat application, real-time dashboard, or processing large datasets, these streaming features help you build responsive and efficient applications.