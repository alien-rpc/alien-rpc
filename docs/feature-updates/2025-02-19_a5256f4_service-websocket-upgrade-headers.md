# WebSocket Upgrade Headers Forwarding

**Commit:** a5256f4eca8398dc82c4a95544a49dc8d450edf2
**Author:** Alec Larson
**Date:** 2025-02-19
**Short SHA:** a5256f4

## Summary

Enhances WebSocket support by forwarding HTTP upgrade request headers to WebSocket handlers and refining the WebSocket context structure for better authentication and metadata access.

## User-Visible Changes

- **Headers Access**: WebSocket handlers can now access upgrade request headers via `ctx.headers`
- **Authentication Support**: Access to authorization headers for token validation in WebSocket routes
- **Custom Headers**: Support for custom protocol headers, client identification, and API versioning
- **Context Cleanup**: Refined WebSocket context structure removes irrelevant request/response objects
- **Type Safety**: Improved TypeScript types for WebSocket-specific context properties
- **Memory Optimization**: Reduced memory usage by excluding unnecessary objects from context
- **Backward Compatibility**: No breaking changes - existing WebSocket routes continue to work unchanged

## Examples

### Headers Access in WebSocket Context

```ts
// Access upgrade request headers in WebSocket handlers
export const authenticatedRoute = route.ws(
  async (data: any, ctx: ws.RequestContext) => {
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

### Context Structure (Before/After)

```ts
// Before: Included request/response properties
export interface RequestContext<TPlatform = unknown>
  extends PeerContext<TPlatform> {
  readonly ip: string
  readonly id: string
  readonly signal: AbortSignal | null
  readonly defer: (handler: (reason?: any) => void) => void
}

// After: Omits request/response, adds headers
export interface RequestContext<TPlatform = unknown>
  extends Omit<PeerContext<TPlatform>, 'request' | 'response'> {
  readonly ip: string
  readonly id: string
  readonly signal: AbortSignal | null
  readonly headers: Headers // NEW: Upgrade request headers
  readonly defer: (handler: (reason?: any) => void) => void
}
```

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

## Config/Flags

- **Header Forwarding**: Upgrade request headers automatically forwarded to WebSocket context via `ctx.headers`
- **Context Creation**: Centralized `createWebSocketContext()` function with property filtering
- **Type Interface**: `RequestContext` extends `Omit<PeerContext, 'request' | 'response'>` with added `headers: Headers`
- **Memory Optimization**: Request/response objects excluded from WebSocket context
- **Client Integration**: Headers set during connection establishment are available in all handlers

## Breaking/Migration

**Breaking Changes:**
- None - purely additive enhancement

**Migration:**
- No code changes required for existing WebSocket routes
- New `ctx.headers` property available for accessing upgrade request headers
- All existing context properties (`id`, `ip`, `signal`, `defer`) remain unchanged

**Client Usage:**
```ts
const client = createClient({
  prefixUrl: 'ws://localhost:3000',
  headers: { authorization: 'Bearer token' }
})
```

## Tags

`websocket` `headers` `authentication` `context` `security` `memory-optimization` `service`

## Evidence

**Authentication**: Access to authorization headers for token validation in WebSocket routes  
**Protocol Support**: Access to `Sec-WebSocket-Protocol` and custom version headers  
**Memory Efficiency**: Reduced context size by excluding request/response objects  
**Type Safety**: Proper TypeScript typing prevents access to irrelevant properties  
**Security**: Header validation and origin checking capabilities for WebSocket connections
