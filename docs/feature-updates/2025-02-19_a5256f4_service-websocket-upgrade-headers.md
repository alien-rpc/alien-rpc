# WebSocket Upgrade Headers Forwarding

**Commit:** a5256f4eca8398dc82c4a95544a49dc8d450edf2
**Author:** Alec Larson
**Date:** 2025-02-19
**Short SHA:** a5256f4

## Summary

This commit enhances WebSocket support by forwarding HTTP upgrade request headers to WebSocket handlers and refining the WebSocket context structure. The changes enable WebSocket handlers to access authentication tokens, custom headers, and other metadata from the original HTTP upgrade request.

## User Impact

**Audience:** Developers using WebSocket routes with authentication or custom headers
**Breaking Change:** No - additive enhancement
**Migration Required:** No - existing code continues to work
**Status:** Stable - part of WebSocket support improvements

## Key Changes

### Headers Access in WebSocket Context

**New Feature:**

```ts
export const authenticatedRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    // Access upgrade request headers
    const authToken = ctx.headers.get('authorization')
    const customHeader = ctx.headers.get('x-custom-header')

    if (!authToken) {
      throw new JSONResponse(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    return processAuthenticatedData(data, authToken)
  }
)
```

### Context Structure Refinement

**Before:**

```ts
// WebSocket context included request/response properties
export interface RequestContext<TPlatform = unknown>
  extends PeerContext<TPlatform> {
  readonly ip: string
  readonly id: string
  readonly signal: AbortSignal | null
  readonly defer: (handler: (reason?: any) => void) => void
}
```

**After:**

```ts
// WebSocket context omits request/response, adds headers
export interface RequestContext<TPlatform = unknown>
  extends Omit<PeerContext<TPlatform>, 'request' | 'response'> {
  readonly ip: string
  readonly id: string
  readonly signal: AbortSignal | null
  readonly headers: Headers // NEW: Upgrade request headers
  readonly defer: (handler: (reason?: any) => void) => void
}
```

### Centralized Context Creation

**Implementation:**

```ts
function createWebSocketContext<P = unknown>(
  peer: Peer<P>,
  signal: AbortSignal | null,
  deferQueue: ((reason?: any) => void)[]
): ws.RequestContext<P> {
  const { request, response, ...context } = peer.context

  return {
    ...context,
    id: peer.id,
    ip: peer.remoteAddress,
    signal,
    headers: request.headers, // Forward upgrade headers
    defer(handler) {
      deferQueue.push(handler)
    },
  }
}
```

## Implementation Details

### Header Forwarding Mechanism

```ts
// Headers are extracted from the original HTTP upgrade request
const { request, response, ...context } = peer.context

// The Headers object is directly forwarded to the WebSocket context
return {
  ...context,
  headers: request.headers, // Original upgrade request headers
  // ... other context properties
}
```

### Context Cleanup

```ts
// Request and response objects are omitted from WebSocket context
// since they're not relevant after the upgrade
const { request, response, ...context } = peer.context

// Only relevant properties are forwarded
return {
  ...context, // Platform-specific context without request/response
  // ... WebSocket-specific properties
}
```

## Use Cases

### Authentication with Bearer Tokens

```ts
export const secureRoute = route.ws(
  async (message: string, ctx: ws.RequestContext) => {
    const authHeader = ctx.headers.get('authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      throw new JSONResponse(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const user = await validateToken(token)

    return processUserMessage(message, user)
  }
)
```

### Custom Protocol Headers

```ts
export const protocolRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    const protocol = ctx.headers.get('sec-websocket-protocol')
    const version = ctx.headers.get('x-api-version')

    switch (protocol) {
      case 'chat-v1':
        return handleChatV1(data, version)
      case 'notifications-v2':
        return handleNotificationsV2(data, version)
      default:
        throw new Error(`Unsupported protocol: ${protocol}`)
    }
  }
)
```

### Client Information Headers

```ts
export const analyticsRoute = route.ws(
  async (event: any, ctx: ws.RequestContext) => {
    const userAgent = ctx.headers.get('user-agent')
    const origin = ctx.headers.get('origin')
    const clientId = ctx.headers.get('x-client-id')

    // Log client information for analytics
    await logClientEvent({
      clientId,
      userAgent,
      origin,
      ip: ctx.ip,
      event,
    })

    return { acknowledged: true }
  }
)
```

## Benefits

### Enhanced Security

- **Authentication**: Access to authorization headers for token validation
- **Origin Validation**: Check origin headers for CORS-like security
- **Client Identification**: Use custom headers for client tracking

### Better Protocol Support

- **Subprotocol Handling**: Access to `Sec-WebSocket-Protocol` headers
- **Version Negotiation**: Use custom version headers for API versioning
- **Feature Detection**: Check client capabilities via custom headers

### Improved Architecture

- **Clean Context**: Removal of irrelevant request/response objects
- **Centralized Creation**: Single function for context creation
- **Type Safety**: Proper typing for WebSocket-specific context

## Client-Side Integration

### Setting Headers During Connection

```ts
// Client can set headers that will be forwarded to handlers
const client = createClient({
  prefixUrl: 'ws://localhost:3000',
  headers: {
    authorization: 'Bearer your-token-here',
    'x-client-version': '1.2.3',
    'x-user-id': 'user-123',
  },
})

// These headers will be available in all WebSocket handlers
const result = await client.authenticatedRoute('Hello')
```

### Dynamic Header Updates

```ts
// Headers are set during connection establishment
// For dynamic updates, reconnection is required
const updateClientHeaders = async (newHeaders: HeadersInit) => {
  // Close existing connection
  client.disconnect()

  // Update headers
  client.options.headers = {
    ...client.options.headers,
    ...newHeaders,
  }

  // Next request will establish new connection with updated headers
  await client.someRoute('data')
}
```

## Migration Guide

### No Breaking Changes

Existing WebSocket routes continue to work without modification:

```ts
// This continues to work exactly as before
export const existingRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    // All existing context properties are still available
    console.log('Client ID:', ctx.id)
    console.log('Client IP:', ctx.ip)

    return processData(data)
  }
)
```

### Accessing New Headers Property

```ts
// Simply add header access where needed
export const enhancedRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    // NEW: Access upgrade request headers
    const authToken = ctx.headers.get('authorization')

    // Existing functionality unchanged
    console.log('Client ID:', ctx.id)

    return processData(data, authToken)
  }
)
```

## Technical Details

### Context Creation Flow

1. **Peer Context Extraction**: Original peer context is destructured
2. **Property Filtering**: Request/response objects are omitted
3. **Header Forwarding**: Headers from upgrade request are included
4. **Context Assembly**: WebSocket-specific properties are added

### Memory Optimization

```ts
// Before: Full peer context including large request/response objects
const context: ws.RequestContext = {
  ...peer.context, // Includes request, response, and other properties
  // ... WebSocket properties
}

// After: Optimized context without unnecessary objects
const { request, response, ...context } = peer.context
const wsContext: ws.RequestContext = {
  ...context, // Only relevant properties
  headers: request.headers, // Just the headers we need
  // ... WebSocket properties
}
```

### Type Safety Improvements

```ts
// Context type explicitly omits request/response
export interface RequestContext<TPlatform = unknown>
  extends Omit<PeerContext<TPlatform>, 'request' | 'response'> {
  // This ensures TypeScript prevents access to request/response
  // while maintaining access to platform-specific properties
}
```

## Related Changes

- **Commit 4569c8c**: Enhanced defer queue mechanism
- **Commit 110075b**: Improved error handling for WebSocket handlers
- **Commit 75399ea**: Optional client WebSocket logic

## Performance Impact

### Memory Usage

- **Reduced**: Elimination of request/response objects from context
- **Optimized**: Only necessary headers are retained
- **Efficient**: Centralized context creation reduces duplication

### Processing Overhead

- **Minimal**: Header forwarding adds negligible overhead
- **Improved**: Cleaner context structure improves garbage collection
- **Optimized**: Single context creation function reduces code paths

## Future Enhancements

**Planned Features:**

- Header-based routing for WebSocket subprotocols
- Built-in authentication middleware using headers
- Header validation and sanitization utilities

**Potential Improvements:**

- Selective header forwarding to reduce memory usage
- Header transformation and normalization
- Integration with authentication providers

## Security Considerations

### Header Validation

```ts
// Always validate headers before use
export const secureRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    const authHeader = ctx.headers.get('authorization')

    // Validate header format
    if (authHeader && !isValidAuthHeader(authHeader)) {
      throw new JSONResponse(
        { error: 'Invalid authorization header format' },
        { status: 400 }
      )
    }

    return processData(data)
  }
)
```

### Sensitive Information

```ts
// Be careful with header logging
export const debugRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
    // DON'T log all headers - may contain sensitive data
    // console.log('All headers:', ctx.headers)

    // DO log specific, safe headers
    console.log('Client version:', ctx.headers.get('x-client-version'))

    return processData(data)
  }
)
```

## Conclusion

This enhancement significantly improves WebSocket functionality by providing access to upgrade request headers while maintaining a clean and efficient context structure. The changes enable better authentication, protocol negotiation, and client identification without breaking existing code.
