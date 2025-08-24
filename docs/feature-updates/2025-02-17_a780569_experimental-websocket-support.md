# Experimental WebSocket Support

**Commit:** a78056926585e9360ebb107650f22f997ace2dae  
**Author:** Alec Larson  
**Date:** Mon Feb 17 19:20:22 2025 -0500  
**Short SHA:** a780569

## Summary

This feature introduces **experimental WebSocket support** to alien-rpc, enabling real-time bidirectional communication between clients and servers. WebSocket routes support three messaging patterns: notifications (one-way), requests (request-response), and subscriptions (streaming responses). All WebSocket communication is multiplexed through a single `/ws` endpoint.

## User Impact

**Audience:** Developers building real-time applications requiring bidirectional communication  
**Breaking Change:** No - purely additive feature  
**Migration Required:** No - existing HTTP routes continue to work unchanged  
**Status:** Experimental - API may change in future versions

## Key Changes

### Added
- WebSocket route definition with `route.ws()` method
- Three messaging patterns: notifications (`n`), requests (`r`), and subscriptions (`s`)
- Client-side WebSocket protocol handler
- Server-side WebSocket compilation and routing
- Connection management with ping/pong and idle timeouts
- Automatic retry logic for WebSocket requests
- Type-safe WebSocket route definitions and client generation

### Enhanced
- Route factory now supports WebSocket routes alongside HTTP routes
- Client generator creates WebSocket-aware method definitions
- Middleware support for WebSocket routes
- Error handling and connection management

## WebSocket Messaging Patterns

### 1. Notifications (Pattern: `n`)
One-way messages from client to server with no response expected.

```ts
// Server-side route definition
export const logEvent = route.ws(
  async (event: string, data: any, ctx: ws.RequestContext) => {
    console.log(`Event: ${event}`, data)
    // No return value - notification pattern
  }
)

// Client usage
const client = defineClient(routes, { prefixUrl: 'ws://localhost:3000' })
await client.logEvent('user_action', { userId: 123, action: 'click' })
```

### 2. Requests (Pattern: `r`)
Request-response pattern similar to HTTP but over WebSocket.

```ts
// Server-side route definition
export const getUserData = route.ws(
  async (userId: string, ctx: ws.RequestContext): Promise<UserData> => {
    const user = await db.users.findById(userId)
    return { id: user.id, name: user.name, email: user.email }
  }
)

// Client usage
const userData = await client.getUserData('123')
console.log(userData) // { id: '123', name: 'John', email: 'john@example.com' }
```

### 3. Subscriptions (Pattern: `s`)
Streaming responses for real-time data updates.

```ts
// Server-side route definition
export const subscribeToUpdates = route.ws(
  async function* (topic: string, ctx: ws.RequestContext) {
    const subscription = await pubsub.subscribe(topic)
    
    try {
      for await (const message of subscription) {
        yield { timestamp: Date.now(), data: message }
      }
    } finally {
      await subscription.unsubscribe()
    }
  }
)

// Client usage
for await (const update of client.subscribeToUpdates('user-events')) {
  console.log('Received update:', update)
}
```

## Server-Side Implementation

### Route Definition
```ts
import { route } from '@alien-rpc/service'
import type { ws } from '@alien-rpc/service'

// Simple notification
export const ping = route.ws(async (message: string) => {
  console.log('Ping received:', message)
})

// Request with response
export const echo = route.ws(async (message: string): Promise<string> => {
  return `Echo: ${message}`
})

// Subscription with streaming
export const streamNumbers = route.ws(async function* (count: number) {
  for (let i = 0; i < count; i++) {
    yield { number: i, timestamp: Date.now() }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
})

// With middleware context
export const authenticatedAction = route.use(authMiddleware).ws(
  async (action: string, ctx: ws.RequestContext<typeof authMiddleware>) => {
    // ctx.user is available from authMiddleware
    console.log(`User ${ctx.user.id} performed: ${action}`)
    return { success: true, userId: ctx.user.id }
  }
)
```

### WebSocket Context
```ts
export const contextExample = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    // WebSocket-specific context properties
    console.log('Client ID:', ctx.id)           // UUID v4 identifier
    console.log('Client IP:', ctx.ip)           // Client IP address
    console.log('Headers:', ctx.headers)        // Upgrade request headers
    
    // Register cleanup handler
    ctx.defer(async (reason) => {
      console.log('Request ended:', reason)
      await cleanup()
    })
    
    // Check if request was aborted
    if (ctx.signal.aborted) {
      throw new Error('Request was aborted')
    }
    
    return { processed: true }
  }
)
```

### Server Setup
```ts
import { ws } from '@alien-rpc/service'
import { createAdapter } from 'your-websocket-adapter' // e.g., hattip-ws

// Compile WebSocket routes
const wsHandler = ws.compileRoutes(
  routes,
  createAdapter,
  {
    // Optional hooks
    onConnect: (peer) => {
      console.log('Client connected:', peer.id)
    },
    onDisconnect: (peer, reason) => {
      console.log('Client disconnected:', peer.id, reason)
    }
  }
)

// Integrate with your server
app.get('/ws', wsHandler)
```

## Client-Side Implementation

### Basic Client Setup
```ts
import { defineClient } from '@alien-rpc/client'
import * as routes from './generated/api' // Generated route definitions

const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  
  // WebSocket-specific options
  wsPingInterval: 30,    // Ping every 30 seconds
  wsPongTimeout: 10,     // Wait 10 seconds for pong
  wsIdleTimeout: 300,    // Close after 5 minutes idle
  
  // Standard options also apply
  retry: 3,
  timeout: 30000
})
```

### Connection Management
```ts
// The client automatically manages the WebSocket connection
// Connection is established on first use and reused for subsequent calls

// First call establishes connection
const result1 = await client.getData()

// Subsequent calls reuse the same connection
const result2 = await client.getMoreData()

// Connection is automatically closed after idle timeout
// or can be manually closed
client.ws?.close()
```

### Error Handling
```ts
import { ws } from '@alien-rpc/client'

try {
  const result = await client.riskyOperation()
} catch (error) {
  if (error instanceof ws.RequestError) {
    console.log('WebSocket request error:', error.code, error.message)
    console.log('Error data:', error.data)
  } else if (error instanceof ws.ConnectionError) {
    console.log('WebSocket connection error:', error.message)
  } else {
    console.log('Other error:', error)
  }
}
```

### Request Cancellation
```ts
// Cancel individual requests
const controller = new AbortController()

const promise = client.longRunningTask({ signal: controller.signal })

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000)

try {
  const result = await promise
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request was cancelled')
  }
}
```

### Streaming Subscriptions
```ts
// Handle streaming responses
const subscription = client.subscribeToEvents('user-123')

try {
  for await (const event of subscription) {
    console.log('Event received:', event)
    
    // Break on specific condition
    if (event.type === 'disconnect') {
      break
    }
  }
} catch (error) {
  console.log('Subscription error:', error)
} finally {
  // Cleanup is automatic, but you can also manually cancel
  subscription.return?.()
}
```

## Type Safety

### Route Type Inference
```ts
// Server-side types are automatically inferred
export const typedRoute = route.ws(
  async (input: { name: string; age: number }): Promise<{ id: string; valid: boolean }> => {
    return { id: generateId(), valid: input.age >= 18 }
  }
)

// Client-side types are automatically generated
const client = defineClient(routes)

// TypeScript knows the parameter and return types
const result = await client.typedRoute({ name: 'John', age: 25 })
// result: { id: string; valid: boolean }
```

### Middleware Type Integration
```ts
const authRoute = route.use(authMiddleware).ws(
  async (data: string, ctx: ws.RequestContext<typeof authMiddleware>) => {
    // ctx.user is typed based on authMiddleware
    return { message: data, userId: ctx.user.id }
  }
)
```

### Pattern-Based Return Types
```ts
// Notification (no return)
const notify = route.ws(async (msg: string) => {
  console.log(msg)
  // No return - automatically inferred as notification pattern
})

// Request (Promise return)
const request = route.ws(async (input: string): Promise<string> => {
  return `Processed: ${input}`
})

// Subscription (AsyncGenerator return)
const subscribe = route.ws(async function* (topic: string) {
  yield { event: 'start', topic }
  yield { event: 'data', topic, data: await fetchData() }
  yield { event: 'end', topic }
})
```

## Advanced Features

### Connection Lifecycle Management
```ts
// Server-side connection hooks
const wsHandler = ws.compileRoutes(routes, createAdapter, {
  onConnect: async (peer) => {
    console.log(`Client ${peer.id} connected from ${peer.remoteAddress}`)
    
    // Store connection metadata
    await redis.set(`connection:${peer.id}`, JSON.stringify({
      connectedAt: Date.now(),
      ip: peer.remoteAddress
    }))
  },
  
  onDisconnect: async (peer, reason) => {
    console.log(`Client ${peer.id} disconnected:`, reason)
    
    // Cleanup connection metadata
    await redis.del(`connection:${peer.id}`)
  },
  
  onError: async (peer, error) => {
    console.error(`Error for client ${peer.id}:`, error)
  }
})
```

### Custom Message Handling
```ts
// Handle custom WebSocket messages
export const customHandler = route.ws(
  async (type: string, payload: any, ctx: ws.RequestContext) => {
    switch (type) {
      case 'heartbeat':
        return { type: 'heartbeat_ack', timestamp: Date.now() }
      
      case 'subscribe':
        const subscription = await createSubscription(payload.topic)
        ctx.defer(() => subscription.cleanup())
        return { type: 'subscribed', topic: payload.topic }
      
      default:
        throw new Error(`Unknown message type: ${type}`)
    }
  }
)
```

### Rate Limiting and Throttling
```ts
const rateLimitMiddleware = createMiddleware(async (ctx, next) => {
  const clientId = ctx.id
  const requests = await redis.incr(`rate_limit:${clientId}`)
  
  if (requests === 1) {
    await redis.expire(`rate_limit:${clientId}`, 60) // 1 minute window
  }
  
  if (requests > 100) {
    throw new Error('Rate limit exceeded')
  }
  
  return next()
})

export const rateLimitedRoute = route.use(rateLimitMiddleware).ws(
  async (data: any) => {
    return { processed: data }
  }
)
```

### Broadcasting and Pub/Sub
```ts
// Server-side broadcasting
const connectedClients = new Set<string>()

export const joinRoom = route.ws(
  async (roomId: string, ctx: ws.RequestContext) => {
    connectedClients.add(ctx.id)
    
    ctx.defer(() => {
      connectedClients.delete(ctx.id)
    })
    
    return { joined: roomId, clientId: ctx.id }
  }
)

export const broadcastMessage = route.ws(
  async (message: string, ctx: ws.RequestContext) => {
    // Broadcast to all connected clients
    // Implementation depends on your WebSocket adapter
    await broadcast(message, Array.from(connectedClients))
    
    return { broadcasted: true, recipients: connectedClients.size }
  }
)
```

## Configuration

### Client Options
```ts
interface WebSocketClientOptions {
  // Connection settings
  prefixUrl: string | URL           // WebSocket server URL
  
  // Ping/Pong settings
  wsPingInterval?: number           // Ping interval in seconds (default: 20)
  wsPongTimeout?: number            // Pong timeout in seconds (default: 20)
  
  // Connection management
  wsIdleTimeout?: number            // Idle timeout in seconds (default: 0 = disabled)
  
  // Standard client options
  retry?: RetryOptions | number     // Retry configuration
  timeout?: number                  // Request timeout
  headers?: HeadersInit             // Headers for upgrade request
}
```

### Server Configuration
```ts
// WebSocket adapter options (varies by adapter)
interface WebSocketAdapterOptions {
  // Connection limits
  maxConnections?: number
  
  // Message limits
  maxMessageSize?: number
  
  // Timeouts
  handshakeTimeout?: number
  
  // Compression
  compression?: boolean
  
  // Custom headers
  headers?: Record<string, string>
}
```

## Performance Considerations

### Connection Pooling
- Single WebSocket connection per client instance
- Automatic connection reuse for multiple route calls
- Connection pooling for server-side applications

### Message Batching
```ts
// Batch multiple notifications for efficiency
const notifications = [
  { type: 'user_online', userId: '123' },
  { type: 'user_online', userId: '456' },
  { type: 'message_sent', messageId: '789' }
]

// Send individually (less efficient)
for (const notification of notifications) {
  await client.notify(notification.type, notification)
}

// Better: Use a batch notification route
export const batchNotify = route.ws(
  async (notifications: Array<{ type: string; data: any }>) => {
    for (const notification of notifications) {
      await processNotification(notification)
    }
  }
)

await client.batchNotify(notifications)
```

### Memory Management
```ts
// Proper cleanup for subscriptions
export const managedSubscription = route.ws(
  async function* (topic: string, ctx: ws.RequestContext) {
    const subscription = await pubsub.subscribe(topic)
    const buffer: any[] = []
    
    // Register cleanup
    ctx.defer(async () => {
      await subscription.unsubscribe()
      buffer.length = 0 // Clear buffer
    })
    
    try {
      for await (const message of subscription) {
        // Limit buffer size to prevent memory leaks
        if (buffer.length > 1000) {
          buffer.shift()
        }
        
        buffer.push(message)
        yield message
      }
    } catch (error) {
      console.error('Subscription error:', error)
      throw error
    }
  }
)
```

## Migration Guide

### From HTTP to WebSocket
```ts
// Before: HTTP route
export const getUpdates = route('/updates').get(
  async (ctx) => {
    return await fetchUpdates()
  }
)

// After: WebSocket subscription
export const subscribeUpdates = route.ws(
  async function* (ctx: ws.RequestContext) {
    const subscription = await createUpdateSubscription()
    
    ctx.defer(() => subscription.cleanup())
    
    for await (const update of subscription) {
      yield update
    }
  }
)

// Client usage change
// Before: Polling
setInterval(async () => {
  const updates = await client.getUpdates()
  processUpdates(updates)
}, 5000)

// After: Real-time subscription
for await (const update of client.subscribeUpdates()) {
  processUpdate(update)
}
```

### Adding WebSocket to Existing API
```ts
// Keep existing HTTP routes
export const getUser = route('/users/:id').get(
  async (pathParams: { id: string }) => {
    return await db.users.findById(pathParams.id)
  }
)

// Add complementary WebSocket routes
export const subscribeUserUpdates = route.ws(
  async function* (userId: string, ctx: ws.RequestContext) {
    const subscription = await db.users.subscribe(userId)
    
    ctx.defer(() => subscription.cleanup())
    
    for await (const update of subscription) {
      yield { userId, ...update }
    }
  }
)

// Client can use both
const user = await client.getUser({ id: '123' })           // HTTP
for await (const update of client.subscribeUserUpdates('123')) { // WebSocket
  console.log('User updated:', update)
}
```

## Limitations and Known Issues

### Current Limitations
1. **Experimental Status**: API may change in future versions
2. **Single Connection**: One WebSocket connection per client instance
3. **No Built-in Authentication**: Must implement custom auth middleware
4. **Limited Adapter Support**: Depends on available WebSocket adapters
5. **No Message Ordering Guarantees**: Messages may arrive out of order

### Browser Compatibility
- **Modern Browsers**: Full support (Chrome 16+, Firefox 11+, Safari 7+)
- **Node.js**: Requires Node.js 18+ for native WebSocket support
- **Polyfills**: May be needed for older environments

### Network Considerations
- **Proxy Support**: Some proxies may not support WebSocket upgrades
- **Firewall Issues**: Corporate firewalls may block WebSocket connections
- **Connection Limits**: Browser limits concurrent WebSocket connections

## Troubleshooting

### Connection Issues
```ts
// Debug connection problems
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // Enable debug logging (implementation-specific)
  debug: true
})

// Handle connection errors
try {
  await client.testConnection()
} catch (error) {
  if (error instanceof ws.ConnectionError) {
    console.error('Failed to connect to WebSocket server')
    console.error('Check server is running and WebSocket endpoint is available')
  }
}
```

### Message Debugging
```ts
// Server-side message logging
export const debugRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    console.log('Received message:', {
      clientId: ctx.id,
      data,
      headers: Object.fromEntries(ctx.headers.entries())
    })
    
    return { received: true, echo: data }
  }
)
```

### Performance Monitoring
```ts
// Monitor WebSocket performance
const performanceMiddleware = createMiddleware(async (ctx, next) => {
  const start = Date.now()
  
  try {
    const result = await next()
    const duration = Date.now() - start
    
    console.log(`WebSocket request completed in ${duration}ms`)
    return result
  } catch (error) {
    const duration = Date.now() - start
    console.error(`WebSocket request failed after ${duration}ms:`, error)
    throw error
  }
})

export const monitoredRoute = route.use(performanceMiddleware).ws(
  async (data: any) => {
    return await processData(data)
  }
)
```

## Dependencies

### New Dependencies
- `hattip-ws` - WebSocket adapter for HatTip (optional peer dependency)
- `crossws` - Cross-platform WebSocket implementation
- `uncrypto` - Cryptographic utilities

### Peer Dependencies
- `@hattip/compose` - Middleware composition (optional)
- WebSocket adapter of choice (varies by platform)

### Compatibility
- **Browsers**: Native WebSocket API
- **Node.js**: Native WebSocket API (18+) or `ws` library
- **Bun**: Native WebSocket support
- **Deno**: Native WebSocket support

## References

**Files Modified:**
- `packages/alien-rpc/src/main.ts` - Added WebSocket exports
- `packages/client/src/client.ts` - Added WebSocket client support
- `packages/client/src/error.ts` - Added WebSocket error types
- `packages/client/src/protocols/websocket.ts` - WebSocket protocol implementation
- `packages/client/src/types.ts` - WebSocket type definitions
- `packages/client/src/utils/joinURL.ts` - URL utilities for WebSocket
- `packages/client/src/utils/retry.ts` - Retry logic for WebSocket
- `packages/generator/src/generator.ts` - WebSocket route generation
- `packages/generator/src/project/analyze-route.ts` - WebSocket route analysis
- `packages/generator/src/project/supporting-types.ts` - WebSocket type support
- `packages/service/package.json` - Added WebSocket dependencies
- `packages/service/src/compileRoute.ts` - WebSocket route compilation
- `packages/service/src/compileRoutes.ts` - WebSocket route compilation
- `packages/service/src/index.ts` - WebSocket exports
- `packages/service/src/internal/importRoute.ts` - WebSocket route imports
- `packages/service/src/response.ts` - WebSocket response handling
- `packages/service/src/route.ts` - WebSocket route factory
- `packages/service/src/types.ts` - WebSocket type definitions
- `packages/service/src/websocket.ts` - WebSocket server implementation
- `pnpm-lock.yaml` - WebSocket dependency updates

**Related Documentation:**
- [WebSocket Protocol Specification](https://tools.ietf.org/html/rfc6455)
- [CrossWS Documentation](https://crossws.unjs.io/)
- [HatTip WebSocket Adapter](https://github.com/hattipjs/hattip)
- [Middleware Documentation](./2025-02-12_15f1b48_add-middleware-support-to-route-definitions.md)

**External References:**
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Server-Sent Events vs WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)
- [WebSocket Security Considerations](https://tools.ietf.org/html/rfc6455#section-10)

## Future Enhancements

**Planned Features:**
- Built-in authentication and authorization
- Message compression and binary support
- Connection pooling and load balancing
- Automatic reconnection with exponential backoff
- Message persistence and replay
- Room-based broadcasting
- WebSocket hooks API (similar to HTTP hooks)

**Potential Improvements:**
- Performance optimizations for high-throughput scenarios
- Better error recovery and resilience
- Integration with popular pub/sub systems
- Monitoring and metrics collection
- Development tools and debugging utilities

## Open Questions

**High Priority:**
- Should we implement automatic reconnection with message replay?
- How should we handle authentication for WebSocket connections?
- What's the best approach for message ordering guarantees?

**Medium Priority:**
- Should we add built-in support for popular pub/sub systems?
- How can we improve the developer experience for debugging WebSocket issues?
- What additional WebSocket adapters should we support?

**Low Priority:**
- Should we implement message compression by default?
- How can we optimize memory usage for long-running subscriptions?
- What metrics should we collect for WebSocket performance monitoring?