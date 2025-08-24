# Disable WebSocket Idle Timeout by Default

**Commit:** bc01bcba1ba2ef66a88fdd57763f2595aa4a56e6
**Author:** Alec Larson
**Date:** Thu Feb 20 22:42:19 2025 -0500
**Short SHA:** bc01bcb

## Summary

This is a **breaking change** that disables the WebSocket idle timeout by default. Previously, WebSocket connections would automatically close after 10 seconds of inactivity. Now, connections remain open indefinitely unless explicitly configured with a timeout value.

## User Impact

**Audience:** All users with WebSocket connections
**Breaking Change:** Yes - idle timeout behavior changed
**Migration Required:** Optional - only if you want to restore the previous timeout behavior

## Key Changes

### Default Value Change

- **Before:** `wsIdleTimeout` defaulted to `10_000` milliseconds (10 seconds)
- **After:** `wsIdleTimeout` defaults to `0` (disabled)

### Timeout Logic Update

- **Condition:** Timeout only applies when `wsIdleTimeout > 0` and `activeRequests === 0`
- **Unit Change:** Timeout value now interpreted as **seconds** instead of milliseconds
- **Behavior:** Connections stay open indefinitely when timeout is disabled

### Documentation Update

- **Description:** Clarified that timeout is "disabled by default and when equal to `0` or less"
- **Unit:** Explicitly documented as "seconds" instead of implicit milliseconds

## Before and After

### Before (10-second Default Timeout)

```ts
// Default behavior - connection closes after 10 seconds of inactivity
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // wsIdleTimeout implicitly set to 10_000ms (10 seconds)
})

// Connection automatically closes after 10 seconds with no active requests
const result = await client.getData()
// ... 10 seconds later with no activity ...
// WebSocket connection automatically closed

// To disable timeout, you had to explicitly set it
const persistentClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 0, // Explicitly disable
})
```

### After (Disabled by Default)

```ts
// Default behavior - connection stays open indefinitely
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // wsIdleTimeout defaults to 0 (disabled)
})

// Connection remains open indefinitely
const result = await client.getData()
// ... connection stays open until manually closed or server closes it ...

// To enable timeout, explicitly set it (now in seconds)
const timeoutClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 30, // Close after 30 seconds of inactivity
})

// Custom timeout values
const shortTimeoutClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 5, // Close after 5 seconds
})

const longTimeoutClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 300, // Close after 5 minutes
})
```

## Migration Guide

### Restore Previous Behavior

If you want to maintain the previous 10-second timeout behavior:

```ts
// Before (implicit 10-second timeout)
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
})

// After (explicit 10-second timeout)
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 10, // 10 seconds (note: now in seconds, not milliseconds)
})
```

### Update Existing Timeout Values

If you were already using custom timeout values, convert from milliseconds to seconds:

```ts
// Before (milliseconds)
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 30_000, // 30 seconds in milliseconds
})

// After (seconds)
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 30, // 30 seconds
})
```

### Disable Timeout Explicitly

To ensure timeout is disabled (defensive programming):

```ts
// Explicitly disable timeout
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 0, // Explicitly disabled
})

// Or use negative value
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: -1, // Also disabled
})
```

## Use Cases and Recommendations

### When to Keep Timeout Disabled (Default)

#### Long-lived Connections

```ts
// Real-time applications that need persistent connections
const realtimeClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // No timeout - connection stays open for real-time updates
})

// Chat applications
const chatClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // Users expect to stay connected until they leave
})

// Live dashboards
const dashboardClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // Continuous data streaming
})
```

#### Server-sent Events Pattern

```ts
// Subscription-based services
const subscriptionClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // Server pushes updates, client doesn't initiate requests
})

const subscription = subscriptionClient.subscribeToUpdates('user-123')
for await (const update of subscription) {
  console.log('Received update:', update)
  // Connection should stay open between updates
}
```

### When to Enable Timeout

#### Resource Management

```ts
// Applications with limited server resources
const resourceConstrainedClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 60, // Close after 1 minute of inactivity
})

// Mobile applications (battery conservation)
const mobileClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 30, // Shorter timeout for mobile
})
```

#### Request-Response Pattern

```ts
// Applications that use WebSocket like HTTP (request-response)
const rpcClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 10, // Close quickly after requests complete
})

// Batch processing
const batchClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 5, // Close after batch completes
})
```

#### Development and Testing

```ts
// Development environment with frequent restarts
const devClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 15, // Prevent stale connections during development
})

// Testing scenarios
const testClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 1, // Quick cleanup between tests
})
```

## Implementation Details

### Timeout Logic

```ts
// Updated timeout implementation
function setIdleTimeout(ws: WebSocket, state = connectionStates.get(ws)!) {
  const { wsIdleTimeout = 0 } = state.options

  // Only set timeout if:
  // 1. wsIdleTimeout > 0 (timeout is enabled)
  // 2. activeRequests === 0 (no active requests)
  if (wsIdleTimeout > 0 && state.activeRequests === 0) {
    clearTimeout(state.idleTimeout)
    state.idleTimeout = setTimeout(() => {
      ws.close() // Close connection after timeout
    }, wsIdleTimeout * 1000) // Convert seconds to milliseconds
  }
}
```

### Connection State Management

```ts
type ConnectionState = {
  options: ClientOptions
  nextId: number
  activeRequests: number // Tracks active requests
  parsedMessages: WeakMap<MessageEvent, Response>
  pingTimeout: any
  pong: () => void
  idleTimeout: any // Timeout handle for idle connections
  onceConnected: (callback: (error?: Error) => void) => void
}

// Timeout is set when:
// 1. A notification is sent (no response expected)
// 2. A request completes and activeRequests becomes 0
// 3. Connection becomes idle

// Timeout is cleared when:
// 1. A new request starts (activeRequests > 0)
// 2. Connection is manually closed
// 3. A new timeout is set (replaces previous)
```

### Request Lifecycle

```ts
// Request start - clear idle timeout
state.activeRequests++
clearTimeout(state.idleTimeout)

// Request end - potentially set idle timeout
if (--state.activeRequests === 0) {
  setIdleTimeout(ws, state)
}

// Notification sent - set idle timeout immediately
sendMessage(ws, method, params)
setIdleTimeout(ws) // No active requests for notifications
```

## Configuration Examples

### Common Timeout Values

```ts
// Very short timeout (testing, quick cleanup)
const quickClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 1, // 1 second
})

// Short timeout (mobile, resource-constrained)
const mobileClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 30, // 30 seconds
})

// Medium timeout (web applications)
const webClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 60, // 1 minute
})

// Long timeout (background services)
const serviceClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 300, // 5 minutes
})

// Very long timeout (persistent connections)
const persistentClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 3600, // 1 hour
})

// Disabled (default)
const defaultClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // wsIdleTimeout: 0 (implicit)
})
```

### Environment-based Configuration

```ts
// Different timeouts for different environments
const client = defineClient(routes, {
  prefixUrl: process.env.WS_URL || 'ws://localhost:3000',
  wsIdleTimeout:
    {
      development: 10, // 10 seconds in development
      test: 1, // 1 second in tests
      staging: 60, // 1 minute in staging
      production: 0, // Disabled in production
    }[process.env.NODE_ENV] || 0,
})

// Mobile vs desktop
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: isMobile() ? 30 : 0, // 30 seconds on mobile, disabled on desktop
})

// Connection type based
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: navigator.connection?.effectiveType === '4g' ? 0 : 60,
})
```

## Benefits of Disabled Default

### Simplified Connection Management

- **No unexpected disconnections** - connections stay open until explicitly closed
- **Predictable behavior** - developers know connections persist
- **Reduced reconnection overhead** - fewer connection cycles

### Better User Experience

- **Real-time applications** - no interruption in live updates
- **Long-running operations** - operations can complete without timeout
- **Consistent connectivity** - users don't experience unexpected disconnections

### Resource Efficiency

- **Fewer reconnections** - reduced CPU and network overhead
- **Connection reuse** - better utilization of established connections
- **Reduced latency** - no reconnection delays

### Developer Experience

- **Explicit configuration** - developers choose timeout behavior
- **Predictable debugging** - connections don't disappear unexpectedly
- **Flexible deployment** - different timeout strategies per environment

## Considerations and Trade-offs

### Memory Usage

```ts
// Monitor connection count in production
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // Consider timeout for high-traffic applications
  wsIdleTimeout: process.env.NODE_ENV === 'production' ? 300 : 0,
})

// Implement connection pooling for server-side usage
class ConnectionPool {
  private connections = new Map<string, Client>()
  private maxConnections = 100

  getClient(url: string): Client {
    if (this.connections.size >= this.maxConnections) {
      // Implement LRU eviction
      const oldestKey = this.connections.keys().next().value
      const oldClient = this.connections.get(oldestKey)
      oldClient?.ws?.close()
      this.connections.delete(oldestKey)
    }

    if (!this.connections.has(url)) {
      const client = defineClient(routes, {
        prefixUrl: url,
        wsIdleTimeout: 60, // Timeout for pooled connections
      })
      this.connections.set(url, client)
    }

    return this.connections.get(url)!
  }
}
```

### Server Resources

```ts
// Server-side connection limits
const server = createServer({
  websocket: {
    maxConnections: 1000,
    idleTimeout: 300, // Server-side timeout
    message: {
      maxSize: 1024 * 1024, // 1MB
    },
  },
})

// Client respects server limits
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 240, // Slightly less than server timeout
})
```

### Network Conditions

```ts
// Adaptive timeout based on network
const getAdaptiveTimeout = () => {
  const connection = navigator.connection
  if (!connection) return 0

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 120 // 2 minutes for slow connections
    case '3g':
      return 60 // 1 minute for 3g
    case '4g':
      return 0 // No timeout for fast connections
    default:
      return 0
  }
}

const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: getAdaptiveTimeout(),
})
```

## Performance Impact

### Connection Overhead

- **Reduced reconnections** - fewer connection establishment cycles
- **Lower CPU usage** - no timeout management when disabled
- **Reduced network traffic** - fewer connection handshakes

### Memory Usage

- **Persistent connections** - connections consume memory until closed
- **Connection state** - each connection maintains state objects
- **Message buffers** - long-lived connections may accumulate buffers

### Monitoring Recommendations

```ts
// Connection monitoring
const monitoredClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 0,
  hooks: {
    afterResponse: [
      ({ response }) => {
        // Log connection metrics
        console.log('WebSocket response:', {
          timestamp: Date.now(),
          readyState: client.ws?.readyState,
          bufferedAmount: client.ws?.bufferedAmount,
        })
      },
    ],
  },
})

// Periodic connection health check
setInterval(() => {
  if (client.ws?.readyState === WebSocket.OPEN) {
    // Connection is healthy
    console.log('WebSocket connection active')
  } else {
    // Connection may need reconnection
    console.warn('WebSocket connection not active')
  }
}, 30000) // Check every 30 seconds
```

## Security Considerations

### Connection Limits

```ts
// Implement client-side connection limits
class SecureClient {
  private static activeConnections = 0
  private static readonly MAX_CONNECTIONS = 10

  static createClient(routes: any, options: ClientOptions) {
    if (this.activeConnections >= this.MAX_CONNECTIONS) {
      throw new Error('Maximum connection limit reached')
    }

    const client = defineClient(routes, {
      ...options,
      wsIdleTimeout: options.wsIdleTimeout ?? 300, // Default 5-minute timeout for security
    })

    this.activeConnections++

    // Clean up on close
    client.ws?.addEventListener('close', () => {
      this.activeConnections--
    })

    return client
  }
}
```

### Authentication Timeout

```ts
// Shorter timeout for unauthenticated connections
const createAuthenticatedClient = async (token: string) => {
  const client = defineClient(routes, {
    prefixUrl: 'ws://localhost:3000',
    headers: { Authorization: `Bearer ${token}` },
    wsIdleTimeout: token ? 0 : 30, // 30 seconds for unauthenticated
  })

  // Verify authentication
  try {
    await client.authenticate()
    // Authentication successful, disable timeout
    return defineClient(routes, {
      prefixUrl: 'ws://localhost:3000',
      headers: { Authorization: `Bearer ${token}` },
      wsIdleTimeout: 0,
    })
  } catch (error) {
    // Authentication failed, keep short timeout
    return client
  }
}
```

## Related Changes

### Previous WebSocket Improvements

- **WebSocket support** (commit a780569) - Initial WebSocket implementation
- **Handler improvements** (commit 110075b) - Enhanced error handling and defer queue
- **Upgrade headers** (commit a5256f4) - Forward upgrade headers to handlers
- **Optional WebSocket logic** (commit 75399ea) - Made WebSocket logic optional

### Future Enhancements

- **Adaptive timeouts** - Dynamic timeout based on usage patterns
- **Connection pooling** - Better connection management for server-side usage
- **Health checks** - Automatic connection health monitoring
- **Reconnection strategies** - Configurable reconnection behavior

## References

**Files Modified:**

- `packages/client/src/protocols/websocket.ts` - Updated timeout logic and default behavior
- `packages/client/src/types.ts` - Updated documentation and default value

**Related Documentation:**

- [WebSocket Support](./2025-02-17_a780569_experimental-websocket-support.md) - Initial WebSocket implementation
- [WebSocket Handler Improvements](./service-websocket-handler-improvements.md) - Server-side improvements
- [WebSocket Upgrade Headers](./service-websocket-upgrade-headers.md) - Header forwarding
- [Optional WebSocket Logic](./client-websocket-optional.md) - Making WebSocket logic optional

**WebSocket Configuration:**

- `wsPingInterval` - Ping interval for connection health (default: 20 seconds)
- `wsPongTimeout` - Pong response timeout (default: 20 seconds)
- `wsIdleTimeout` - Idle connection timeout (default: 0 = disabled)

**Best Practices:**

- Use timeouts in resource-constrained environments
- Disable timeouts for real-time applications
- Monitor connection health in production
- Implement connection limits for security
- Consider network conditions when setting timeouts
