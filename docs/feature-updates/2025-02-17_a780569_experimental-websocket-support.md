# Experimental WebSocket Support

**Status: Enhancement (Experimental)**

## Summary

Introduces experimental WebSocket support to alien-rpc, enabling real-time bidirectional communication. Supports three messaging patterns: notifications, requests, and subscriptions with automatic connection management through a single `/ws` endpoint.

## User-Visible Changes

- New `route.ws()` method for defining WebSocket endpoints
- Three messaging patterns: notifications, requests, and subscriptions
- Automatic connection management with ping/pong and idle timeouts
- Middleware support for WebSocket routes
- Seamless WebSocket methods in generated client code
- Experimental status - API may change in future versions

## Examples

### WebSocket Routes

```ts
// Notification (one-way)
export const logEvent = route.ws(
  async (event: string, data: any) => {
    console.log(`Event: ${event}`, data)
  }
)

// Request-response
export const getUserData = route.ws(
  async (userId: string): Promise<UserData> => {
    return await db.users.findById(userId)
  }
)

// Subscription (streaming)
export const subscribeToUpdates = route.ws(
  async function* (topic: string) {
    const subscription = await pubsub.subscribe(topic)
    for await (const message of subscription) {
      yield { timestamp: Date.now(), data: message }
    }
  }
)
```

### Client Usage

```ts
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsPingInterval: 30,
  wsIdleTimeout: 300
})

// Notification
await client.logEvent('user_action', { userId: 123 })

// Request-response
const userData = await client.getUserData('123')

// Subscription
for await (const update of client.subscribeToUpdates('user-events')) {
  console.log('Received update:', update)
}
```

## Config/Flags

- Client options: `wsPingInterval`, `wsPongTimeout`, `wsIdleTimeout`, `retry`, `timeout`
- Server options: `maxConnections`, `maxMessageSize`, `handshakeTimeout`, `compression`

## Breaking/Migration

**Breaking Changes:** None - experimental feature addition

**Migration:** Teams can add WebSocket routes incrementally alongside existing API

## Tags

`enhancement` `websocket` `real-time` `experimental` `streaming`

## Evidence

**Patterns:** Three messaging patterns (notifications, requests, subscriptions)  
**Type Safety:** Type-safe WebSocket routes with automatic client generation  
**Connection Management:** Lifecycle management with ping/pong and idle timeouts  
**Architecture:** Middleware support and single connection reuse