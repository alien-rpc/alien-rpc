# Replace hattip-ws with alien-ws

**Commit:** 3ac11dbcc9fd0caeb77f1b0606f609569526db47  
**Author:** Alec Larson  
**Date:** Tue May 13 15:17:58 2025 -0400  
**Short SHA:** 3ac11db

## Summary

Replaces `hattip-ws` WebSocket adapter dependency with `alien-ws` for better type safety and ecosystem integration.

## User-Visible Changes

- **Breaking Change**: WebSocket adapter dependency changed from `hattip-ws` to `alien-ws`
- **Import Updates**: All WebSocket adapter imports must be updated to use `alien-ws`
- **Enhanced Type Safety**: Better type inference for peer contexts and middleware chains
- **Improved Integration**: Tighter integration with alien-middleware system
- **API Compatibility**: WebSocket route definitions remain unchanged
- **Client Unaffected**: Generated client code and usage patterns unchanged
- **Migration Required**: Update dependencies and import statements
- **Better Performance**: Optimized WebSocket handling with reduced overhead

## Examples

### Dependency Migration

```bash
# Remove old dependency
npm uninstall hattip-ws

# Install new dependency
npm install alien-ws
```

### Import Updates

```ts
// Before
import type { WebSocketAdapter } from 'hattip-ws'
import { createHattipAdapter } from 'hattip-ws/adapters/node'

// After
import type { WebSocketAdapter } from 'alien-ws'
import { createNodeAdapter } from 'alien-ws/adapters/node'
```

### Enhanced Type Safety

```ts
// Before - less precise type inference
function createWebSocketContext<TMiddleware extends MiddlewareChain>(
  peer: Peer<PeerContext<TMiddleware>>,
  deferQueue: ((reason?: any) => void)[],
  signal?: AbortSignal
): ws.RequestContext<TMiddleware> {
  const { request, ...context } = peer.context
  // Type inference was less precise
}

// After - explicit type assertion for better type safety
function createWebSocketContext<TMiddleware extends MiddlewareChain>(
  peer: Peer<PeerContext<TMiddleware>>,
  deferQueue: ((reason?: any) => void)[],
  signal?: AbortSignal
): ws.RequestContext<TMiddleware> {
  const { request, ...context } = peer.context as PeerContext<TMiddleware>
  // Explicit type assertion for better type safety
}
```

## Config/Flags

- `alien-ws`: New peer dependency (optional)
- `hattip-ws`: Removed peer dependency
- WebSocket adapter imports changed from `hattip-ws/*` to `alien-ws/*`
- Enhanced type inference for `PeerContext<TMiddleware>`

## Breaking/Migration

- **Breaking**: Dependency changed from `hattip-ws` to `alien-ws`
- **Migration**: Run `npm uninstall hattip-ws && npm install alien-ws`
- **Import Changes**: Update all imports from `hattip-ws` to `alien-ws`
- **Adapter Changes**: `createHattipAdapter` → `createNodeAdapter`
- **Compatibility**: WebSocket route definitions remain unchanged

## Tags

`websocket` `breaking-change` `dependency` `type-safety` `alien-ws` `hattip-ws` `migration`

## Evidence

- **Files Modified**: `packages/service/package.json`, `packages/service/src/websocket.ts`
- **Dependency Change**: `hattip-ws` → `alien-ws` in peer dependencies
- **Import Updates**: All WebSocket adapter imports updated to `alien-ws`
- **Type Safety**: Enhanced type inference for peer contexts and middleware chains
- **API Compatibility**: WebSocket route definitions and client code unchanged
- **Performance**: Optimized WebSocket handling with reduced overhead