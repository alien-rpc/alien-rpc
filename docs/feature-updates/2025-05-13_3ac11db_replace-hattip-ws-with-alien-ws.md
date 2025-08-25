# Replace hattip-ws with alien-ws

**Commit:** 3ac11dbcc9fd0caeb77f1b0606f609569526db47  
**Author:** Alec Larson  
**Date:** Tue May 13 15:17:58 2025 -0400  
**Short SHA:** 3ac11db

## Summary

This is a **breaking change** that replaces the `hattip-ws` WebSocket adapter dependency with `alien-ws`, providing a more integrated and type-safe WebSocket implementation. The migration enhances WebSocket functionality with better type inference, improved peer context handling, and tighter integration with the alien-rpc ecosystem.

## User Impact

**Audience:** Backend developers using alien-rpc WebSocket functionality  
**Breaking Change:** Yes - WebSocket adapter dependency and import changes  
**Migration Required:** Yes - update WebSocket adapter imports and peer dependencies  
**Status:** Stable - part of WebSocket system improvements

## Key Changes

### Removed
- `hattip-ws` peer dependency from service package
- HatTip-specific WebSocket adapter types
- Legacy peer context handling

### Added
- `alien-ws` peer dependency (optional)
- Enhanced WebSocket adapter with better type safety
- Improved peer context type inference
- Better integration with alien-middleware system

### Enhanced
- `PeerContext` now properly typed with middleware chain generics
- WebSocket route compilation with improved type inference
- Better error handling and context propagation
- Streamlined WebSocket adapter interface

## Breaking Changes

### 1. Dependency Changes

**Before:**
```json
{
  "peerDependencies": {
    "hattip-ws": "*"
  },
  "peerDependenciesMeta": {
    "hattip-ws": {
      "optional": true
    }
  }
}
```

**After:**
```json
{
  "peerDependencies": {
    "alien-ws": "*"
  },
  "peerDependenciesMeta": {
    "alien-ws": {
      "optional": true
    }
  }
}
```

### 2. Import Changes

**Before:**
```ts
import type {
  ExtractHooks,
  Peer,
  PeerContext,
  WebSocketAdapter,
  WebSocketAdapterOptions,
} from 'hattip-ws'
```

**After:**
```ts
import type {
  ExtractHooks,
  Peer,
  PeerContext,
  WebSocketAdapter,
  WebSocketAdapterOptions,
} from 'alien-ws'
```

### 3. Type Inference Improvements

**Before:**
```ts
function createWebSocketContext<TMiddleware extends MiddlewareChain>(
  peer: Peer<PeerContext<TMiddleware>>,
  deferQueue: ((reason?: any) => void)[],
  signal?: AbortSignal
): ws.RequestContext<TMiddleware> {
  const { request, ...context } = peer.context
  // Type inference was less precise
}
```

**After:**
```ts
function createWebSocketContext<TMiddleware extends MiddlewareChain>(
  peer: Peer<PeerContext<TMiddleware>>,
  deferQueue: ((reason?: any) => void)[],
  signal?: AbortSignal
): ws.RequestContext<TMiddleware> {
  const { request, ...context } = peer.context as PeerContext<TMiddleware>
  // Explicit type assertion for better type safety
}
```

## Migration Guide

### Step 1: Update Dependencies

```bash
# Remove old dependency
npm uninstall hattip-ws

# Install new dependency
npm install alien-ws
```

### Step 2: Update Imports

```ts
// Before
import type { WebSocketAdapter } from 'hattip-ws'

// After
import type { WebSocketAdapter } from 'alien-ws'
```

### Step 3: Update WebSocket Adapter Usage

```ts
// Before - using hattip-ws adapter
import { createHattipAdapter } from 'hattip-ws/adapters/node'
import { ws } from '@alien-rpc/service'

const wsHandler = ws.compileRoutes(routes, createHattipAdapter)

// After - using alien-ws adapter
import { createNodeAdapter } from 'alien-ws/adapters/node'
import { ws } from '@alien-rpc/service'

const wsHandler = ws.compileRoutes(routes, createNodeAdapter)
```

### Step 4: Update Custom WebSocket Middleware

```ts
// Before - hattip-ws context
import type { PeerContext } from 'hattip-ws'

const wsMiddleware = (peer: Peer<PeerContext>) => {
  // middleware logic
}

// After - alien-ws context with better typing
import type { PeerContext } from 'alien-ws'
import type { MiddlewareChain } from 'alien-middleware'

const wsMiddleware = <T extends MiddlewareChain>(
  peer: Peer<PeerContext<T>>
) => {
  // middleware logic with better type inference
}
```

## New Features

### Enhanced Type Safety

```ts
import { ws, route } from '@alien-rpc/service'
import type { PeerContext } from 'alien-ws'

// Better type inference for WebSocket contexts
const authenticatedWsRoute = route.use(authMiddleware).ws(
  async (data: any, ctx: ws.RequestContext<typeof authMiddleware>) => {
    // ctx.user is properly typed and guaranteed by middleware
    return { userId: ctx.user.id, data }
  }
)
```

### Improved Peer Context Handling

```ts
// alien-ws provides better context type inference
const wsHandler = ws.compileRoutes(routes, createNodeAdapter, {
  onConnect: async (peer: Peer<PeerContext<MiddlewareChain>>) => {
    // Peer context is properly typed with middleware chain
    console.log(`Client ${peer.id} connected from ${peer.remoteAddress}`)
  },
  onDisconnect: async (peer, reason) => {
    console.log(`Client ${peer.id} disconnected:`, reason)
  },
})
```

## Benefits

### Ecosystem Integration
- Better integration with alien-middleware system
- Consistent API patterns across alien-rpc packages
- Reduced external dependencies on HatTip ecosystem

### Type Safety Improvements
- Enhanced type inference for peer contexts
- Better middleware chain type propagation
- More precise WebSocket adapter typing

### Performance
- Optimized WebSocket handling
- Reduced overhead from adapter abstraction
- Better memory management for peer contexts

## Implementation Details

### Files Modified
- `packages/service/package.json` - Updated peer dependencies
- `packages/service/src/websocket.ts` - Updated imports and type assertions

### Dependency Changes
```json
{
  "peerDependencies": {
    "alien-ws": "*"
  },
  "removed": {
    "hattip-ws": "removed"
  }
}
```

### API Compatibility
- WebSocket route definitions remain unchanged
- Generated client code is unaffected
- Existing WebSocket handlers work without modification

## Compatibility Notes

### Backward Compatibility
- WebSocket route definitions are fully compatible
- Client-side WebSocket usage unchanged
- Generated types remain consistent

### Breaking Changes Summary
- Import paths changed from `hattip-ws` to `alien-ws`
- Peer dependency updated
- Type assertions added for better type safety

## Troubleshooting

### Common Migration Issues

**Issue:** `Cannot find module 'hattip-ws'`
```bash
# Solution: Update dependency
npm uninstall hattip-ws
npm install alien-ws
```

**Issue:** WebSocket adapter not found
```ts
// Before
import { createHattipAdapter } from 'hattip-ws/adapters/node'

// After
import { createNodeAdapter } from 'alien-ws/adapters/node'
```

**Issue:** Type errors with peer context
```ts
// Solution: Use proper generic typing
const wsHandler = ws.compileRoutes(
  routes,
  createNodeAdapter,
  {
    onConnect: async (peer: Peer<PeerContext<MiddlewareChain>>) => {
      // Properly typed peer context
    }
  }
)
```

## Future Considerations

### Planned Enhancements
- Additional WebSocket adapter implementations
- Enhanced debugging and monitoring tools
- Performance optimizations for high-throughput scenarios
- Better integration with alien-middleware features

### Migration Timeline
- **Immediate:** Update dependencies and imports
- **Short-term:** Migrate custom WebSocket adapters
- **Long-term:** Adopt new alien-ws features and optimizations

## References

**External Documentation:**
- [alien-ws GitHub](https://github.com/alloc/alien-ws)
- [WebSocket Adapter Guide](https://github.com/alloc/alien-ws/blob/main/docs/adapters.md)

**Related Changes:**
- [Migrate to alien-middleware](./2025-05-04_fce6890_migrate-to-alien-middleware.md)
- [Experimental WebSocket Support](./2025-02-17_a780569_experimental-websocket-support.md)
- [WebSocket Handler Improvements](./2025-02-19_110075b_service-websocket-handler-improvements.md)

**Files Modified:**
- `packages/service/src/websocket.ts` - WebSocket implementation updates
- `packages/service/package.json` - Dependency changes

This migration represents a significant step toward a more integrated and type-safe WebSocket implementation in alien-rpc, providing better developer experience and tighter ecosystem integration while maintaining API compatibility.