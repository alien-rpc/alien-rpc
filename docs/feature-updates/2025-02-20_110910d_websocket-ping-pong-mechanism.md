# WebSocket Ping/Pong Mechanism

**Commit:** 110910d85e76c2f7ded270cc97e1f4c50e9fb433
**Author:** Alec Larson
**Date:** Thu Feb 20 22:47:19 2025 -0500
**Short SHA:** 110910d

## Summary

This commit adds a ping/pong mechanism to WebSocket connections for connection health monitoring and automatic detection of broken connections. The implementation includes configurable ping intervals, pong timeouts, and automatic connection closure when the remote peer becomes unresponsive.

## User Impact

**Audience:** All users with WebSocket connections
**Breaking Change:** No - additive enhancement
**Migration Required:** No - works with existing code

## Key Features

### Automatic Ping/Pong Health Checks

- **Client-initiated pings** - Client sends periodic ping messages to server
- **Server pong responses** - Server automatically responds to ping messages
- **Connection monitoring** - Detects broken or unresponsive connections
- **Automatic cleanup** - Closes connections that fail to respond to pings

### Configurable Timing

- **Ping interval** - Configurable time between ping messages (default: 20 seconds)
- **Pong timeout** - Configurable timeout for pong responses (default: 20 seconds)
- **Smart scheduling** - Pings only sent when connection is idle

### Seamless Integration

- **Transparent operation** - No changes required to existing WebSocket usage
- **Protocol compliance** - Uses standard JSON-RPC message format
- **Error handling** - Graceful connection closure on timeout

## Implementation Details

### Client-Side Ping Logic

```ts
// Ping scheduling in packages/client/src/protocols/websocket.ts
function setPingTimeout(ws: WebSocket, state = connectionStates.get(ws)!) {
  const { wsPingInterval = 20, wsPongTimeout = 20 } = state.options

  if (wsPingInterval > 0) {
    clearTimeout(state.pingTimeout)
    state.pingTimeout = setTimeout(() => {
      // Set up pong timeout
      const pongTimeout = setTimeout(() => {
        ws.close() // Close connection if no pong received
      }, wsPongTimeout * 1000)

      // Set up pong handler
      state.pong = () => {
        clearTimeout(pongTimeout)
        state.pong = noop // Reset pong handler
      }

      // Send ping message
      ws.send(JSON.stringify({ method: '.ping' }))
    }, wsPingInterval * 1000)
  }
}
```

### Server-Side Pong Response

```ts
// Automatic pong response in packages/service/src/websocket.ts
if (method === '.ping') {
  return void peer.send({ pong: true })
}
```

### Connection State Management

```ts
type ConnectionState = {
  options: ClientOptions
  nextId: number
  activeRequests: number
  parsedMessages: WeakMap<MessageEvent, Response>
  pingTimeout: any // Timeout handle for next ping
  pong: () => void // Pong response handler
  idleTimeout: any
  onceConnected: (callback: (error?: Error) => void) => void
}
```

## Configuration Options

### Client Configuration

```ts
interface ClientOptions {
  /**
   * The WebSocket connection ping interval (in seconds). Pings are only
   * sent if enough time has passed between messages, either sent or
   * received.
   *
   * Disabled when equal to `0` or less.
   *
   * @default 20
   */
  wsPingInterval?: number | undefined

  /**
   * The WebSocket connection pong timeout (in seconds). If a pong is not
   * received within this time, the connection will be closed.
   *
   * @default 20
   */
  wsPongTimeout?: number | undefined
}
```

### Usage Examples

```ts
// Default ping/pong behavior (20-second intervals)
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // wsPingInterval: 20 (default)
  // wsPongTimeout: 20 (default)
})

// Custom ping interval
const fastPingClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 10, // Ping every 10 seconds
  wsPongTimeout: 5, // 5-second pong timeout
})

// Slower ping for stable connections
const slowPingClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 60, // Ping every minute
  wsPongTimeout: 30, // 30-second pong timeout
})

// Disable ping/pong mechanism
const noPingClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 0, // Disabled
})
```

## Use Cases and Benefits

### Connection Health Monitoring

```ts
// Real-time applications requiring reliable connections
const realtimeClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 15, // Frequent health checks
  wsPongTimeout: 10, // Quick failure detection
})

// Monitor connection events
realtimeClient.ws?.addEventListener('close', event => {
  if (event.code === 1006) {
    console.log('Connection closed due to ping timeout')
    // Implement reconnection logic
  }
})
```

### Network Reliability

```ts
// Mobile applications with unstable networks
const mobileClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 30, // Conservative ping interval
  wsPongTimeout: 15, // Reasonable timeout for mobile networks
  wsIdleTimeout: 0, // Keep connection open
})

// Server applications with high reliability requirements
const serverClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 10, // Aggressive health checking
  wsPongTimeout: 5, // Quick failure detection
  wsIdleTimeout: 300, // Close idle connections
})
```

### Load Balancer Compatibility

```ts
// Configure for load balancers with connection timeouts
const lbCompatibleClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 25, // Slightly less than LB timeout (30s)
  wsPongTimeout: 10, // Quick detection
  wsIdleTimeout: 0, // Let ping/pong handle health
})
```

### Development and Testing

```ts
// Development environment with quick feedback
const devClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 5, // Quick detection of server restarts
  wsPongTimeout: 2, // Fast failure detection
})

// Testing with controlled timeouts
const testClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 1, // Very frequent pings for testing
  wsPongTimeout: 1, // Quick timeout for test scenarios
})
```

## Protocol Details

### Ping Message Format

```json
{
  "method": ".ping"
}
```

### Pong Response Format

```json
{
  "pong": true
}
```

### Message Flow

```
Client                           Server
  |                                |
  |  { "method": ".ping" }         |
  |------------------------------->|
  |                                |
  |         { "pong": true }       |
  |<-------------------------------|
  |                                |
```

### Timing Behavior

```
Time: 0s    - Connection established
Time: 20s   - First ping sent (after wsPingInterval)
Time: 20.1s - Pong received, next ping scheduled
Time: 40s   - Second ping sent
Time: 60s   - Ping timeout (no pong received within wsPongTimeout)
Time: 60s   - Connection closed
```

## Integration with Other Features

### Idle Timeout Interaction

```ts
// Ping/pong works alongside idle timeout
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 20, // Health check every 20 seconds
  wsPongTimeout: 10, // Pong timeout
  wsIdleTimeout: 60, // Close after 60 seconds of no requests
})

// Behavior:
// - Ping/pong maintains connection health
// - Idle timeout closes connection when no active requests
// - Ping messages don't count as "active requests"
```

### Message Scheduling

```ts
// Pings are scheduled intelligently
// - After sending a request
// - After receiving a response
// - After connection becomes idle
// - Not sent if recent activity occurred

// Example timeline:
const client = defineClient(routes, { wsPingInterval: 20 })

// Time 0: Connection established, ping scheduled for time 20
// Time 5: Send request, ping rescheduled for time 25
// Time 6: Receive response, ping rescheduled for time 26
// Time 26: Send ping (no activity for 20 seconds)
```

### Error Handling

```ts
// Connection closure scenarios
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 10,
  wsPongTimeout: 5,
})

// Monitor connection health
client.ws?.addEventListener('close', event => {
  switch (event.code) {
    case 1000: // Normal closure
      console.log('Connection closed normally')
      break
    case 1006: // Abnormal closure (likely ping timeout)
      console.log('Connection lost - ping timeout or network error')
      // Implement reconnection logic
      break
    default:
      console.log('Connection closed with code:', event.code)
  }
})

// Handle ping timeout in application logic
const handlePingTimeout = () => {
  console.log('Connection health check failed')
  // Attempt reconnection
  // Update UI to show connection status
  // Queue requests for retry
}
```

## Performance Considerations

### Network Overhead

```ts
// Minimal overhead - small JSON messages
const pingMessage = { method: '.ping' } // ~20 bytes
const pongResponse = { pong: true } // ~15 bytes

// Total overhead per ping cycle: ~35 bytes
// With default 20-second interval: ~1.75 bytes/second
// Negligible impact on bandwidth
```

### CPU Usage

```ts
// Lightweight operations
// - setTimeout/clearTimeout for scheduling
// - JSON.stringify/parse for messages
// - WebSocket send/receive
// - Minimal impact on application performance
```

### Memory Usage

```ts
// Per-connection state
type PingPongState = {
  pingTimeout: NodeJS.Timeout | number // ~8 bytes
  pong: () => void // ~8 bytes (function reference)
}

// Total additional memory per connection: ~16 bytes
// Scales linearly with connection count
```

## Monitoring and Debugging

### Connection Health Metrics

```ts
// Track ping/pong statistics
class ConnectionMonitor {
  private pingsSent = 0
  private pongsReceived = 0
  private timeouts = 0

  onPingSent() {
    this.pingsSent++
    console.log(`Ping sent (total: ${this.pingsSent})`)
  }

  onPongReceived() {
    this.pongsReceived++
    console.log(`Pong received (total: ${this.pongsReceived})`)
  }

  onTimeout() {
    this.timeouts++
    console.log(`Ping timeout (total: ${this.timeouts})`)
  }

  getHealthRatio() {
    return this.pingsSent > 0 ? this.pongsReceived / this.pingsSent : 1
  }
}

// Usage with client
const monitor = new ConnectionMonitor()
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  hooks: {
    afterResponse: [
      ({ response }) => {
        if (response.pong) {
          monitor.onPongReceived()
        }
      },
    ],
  },
})
```

### Debug Logging

```ts
// Enable debug logging for ping/pong
const debugClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 10,
  wsPongTimeout: 5,
})

// Log ping/pong activity
debugClient.ws?.addEventListener('message', event => {
  const data = JSON.parse(event.data)
  if (data.method === '.ping') {
    console.log('🏓 Ping sent at', new Date().toISOString())
  } else if (data.pong) {
    console.log('🏓 Pong received at', new Date().toISOString())
  }
})

debugClient.ws?.addEventListener('close', event => {
  console.log('🔌 Connection closed:', {
    code: event.code,
    reason: event.reason,
    wasClean: event.wasClean,
    timestamp: new Date().toISOString(),
  })
})
```

## Best Practices

### Timeout Configuration

```ts
// Conservative settings for production
const productionClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 30, // Less frequent pings
  wsPongTimeout: 15, // Reasonable timeout
  wsIdleTimeout: 0, // Let ping/pong handle health
})

// Aggressive settings for critical applications
const criticalClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 10, // Frequent health checks
  wsPongTimeout: 5, // Quick failure detection
  wsIdleTimeout: 300, // Close idle connections
})
```

### Network Adaptation

```ts
// Adapt to network conditions
const getNetworkAwarePingInterval = () => {
  const connection = navigator.connection
  if (!connection) return 20 // Default

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 60 // Slower pings for slow networks
    case '3g':
      return 30 // Moderate pings for 3g
    case '4g':
      return 15 // Faster pings for fast networks
    default:
      return 20
  }
}

const adaptiveClient = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: getNetworkAwarePingInterval(),
  wsPongTimeout: 10,
})
```

### Reconnection Strategy

```ts
// Implement reconnection with ping/pong awareness
class ReconnectingClient {
  private client: Client
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(routes: any, options: ClientOptions) {
    this.client = this.createClient(routes, options)
  }

  private createClient(routes: any, options: ClientOptions) {
    const client = defineClient(routes, {
      ...options,
      wsPingInterval: 20,
      wsPongTimeout: 10,
    })

    client.ws?.addEventListener('close', event => {
      if (
        event.code === 1006 &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        // Ping timeout or network error - attempt reconnection
        this.reconnectAttempts++
        const delay = Math.min(
          1000 * Math.pow(2, this.reconnectAttempts),
          30000
        )

        setTimeout(() => {
          console.log(`Reconnection attempt ${this.reconnectAttempts}`)
          this.client = this.createClient(routes, options)
        }, delay)
      }
    })

    client.ws?.addEventListener('open', () => {
      this.reconnectAttempts = 0 // Reset on successful connection
    })

    return client
  }
}
```

## Security Considerations

### Rate Limiting

```ts
// Server-side ping rate limiting
const pingRateLimit = new Map<string, number>()

// In WebSocket message handler
if (method === '.ping') {
  const clientId = getClientId(peer)
  const now = Date.now()
  const lastPing = pingRateLimit.get(clientId) || 0

  if (now - lastPing < 1000) {
    // Minimum 1 second between pings
    return // Ignore rapid pings
  }

  pingRateLimit.set(clientId, now)
  return void peer.send({ pong: true })
}
```

### Resource Protection

```ts
// Prevent ping timeout abuse
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: Math.max(5, userConfiguredInterval), // Minimum 5 seconds
  wsPongTimeout: Math.min(30, userConfiguredTimeout), // Maximum 30 seconds
})
```

## Related Changes

### WebSocket Feature Evolution

- **WebSocket support** (commit a780569) - Initial WebSocket implementation
- **Handler improvements** (commit 110075b) - Enhanced error handling and defer queue
- **Upgrade headers** (commit a5256f4) - Forward upgrade headers to handlers
- **Optional WebSocket logic** (commit 75399ea) - Made WebSocket logic optional
- **Idle timeout disabled** (commit bc01bcb) - Disabled idle timeout by default
- **Ping/pong mechanism** (commit 110910d) - This commit

### Future Enhancements

- **Adaptive ping intervals** - Dynamic adjustment based on network conditions
- **Ping statistics** - Built-in connection health metrics
- **Custom ping messages** - Application-specific health check data
- **Heartbeat coordination** - Coordinate with server-side heartbeats

## References

**Files Modified:**

- `packages/client/src/protocols/websocket.ts` - Client-side ping/pong implementation
- `packages/client/src/types.ts` - Added `wsPingInterval` and `wsPongTimeout` options
- `packages/service/src/websocket.ts` - Server-side pong response handling

**Related Documentation:**

- [WebSocket Support](./2025-02-17_a780569_experimental-websocket-support.md) - Initial WebSocket implementation
- [WebSocket Handler Improvements](./service-websocket-handler-improvements.md) - Server-side improvements
- [WebSocket Idle Timeout Disabled](./client-websocket-idle-timeout-disabled.md) - Idle timeout changes
- [WebSocket Upgrade Headers](./service-websocket-upgrade-headers.md) - Header forwarding

**WebSocket Configuration Reference:**

- `wsPingInterval` - Ping interval in seconds (default: 20, disabled when ≤ 0)
- `wsPongTimeout` - Pong response timeout in seconds (default: 20)
- `wsIdleTimeout` - Idle connection timeout in seconds (default: 0 = disabled)

**Protocol Specification:**

- Ping messages use method `.ping` with no parameters
- Pong responses use `{ pong: true }` format
- Connection closed on pong timeout with code 1006
- Pings only sent during idle periods (no active requests)
