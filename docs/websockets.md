# Websockets

`alien-rpc` provides a high-level API for websockets, allowing you to define websocket routes that share a single connection.

## Defining a Websocket Route

All websocket routes are funneled through the same `/ws` endpoint by default. You define them using `route.ws()`.

```typescript
import { route } from 'alien-rpc/service'

export const chat = route.ws((ctx) => {
  // Access middleware context just like HTTP routes
  const { user } = ctx

  ctx.on('message', (msg) => {
    // Broadcast or reply
    ctx.send({ from: user.name, text: msg })
  })

  ctx.on('close', () => {
    console.log('User disconnected')
  })
})
```

## Messaging Patterns

The websocket implementation supports different communication patterns:

1.  **Notifications**: One-way messages sent from client to server or vice versa.
2.  **Requests**: The client sends a message and expects a specific response (RPC over WS).
3.  **Subscriptions**: The client subscribes to a topic and receives multiple updates over time.

## Client-side Usage

The generated client includes support for connecting to and interacting with websocket routes.

```typescript
import { client } from './api'

// Connection is established automatically on first use
const socket = client.chat()

socket.send('Hello!')

socket.on('message', (data) => {
  console.log('Received:', data)
})
```

## Middleware Support

Websocket routes can also benefit from middlewares. The middleware runs when the websocket connection is first established (during the upgrade request).

```typescript
const authenticatedRoute = route.use(requireSession)

export const privateChat = authenticatedRoute.ws((ctx) => {
  // ctx.user is available here
})
```
