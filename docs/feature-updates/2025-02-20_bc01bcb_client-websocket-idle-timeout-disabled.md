# Disable WebSocket Idle Timeout by Default

**Commit:** bc01bcb  
**Date:** 2025-02-20  
**Type:** Breaking Change  
**Scope:** Client WebSocket Protocol  

## Summary

Disables WebSocket idle timeout by default. Previously, connections closed after 10 seconds of inactivity. Now connections remain open indefinitely unless explicitly configured.

## User-Visible Changes

- **Breaking Change**: Default `wsIdleTimeout` changed from 10 seconds to 0 (disabled)
- **Unit Change**: Timeout values now in seconds instead of milliseconds
- **Persistent Connections**: Connections stay open indefinitely by default
- **Explicit Configuration**: Must set `wsIdleTimeout > 0` to enable timeout
- **Real-time Friendly**: Better for long-lived connections and real-time apps
- **Resource Consideration**: May increase memory usage with many idle connections
- **Migration**: Set `wsIdleTimeout: 10` to restore previous 10-second timeout behavior

## Examples

### Default Behavior Change

```ts
// Before: 10-second timeout by default
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // wsIdleTimeout was 10_000ms (10 seconds)
})

// After: No timeout by default
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  // wsIdleTimeout defaults to 0 (disabled)
})
```

### Enabling Timeout (New Behavior)

```ts
// Restore previous 10-second timeout
const client = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 10, // 10 seconds (note: now in seconds, not ms)
})

// Custom timeout values
const shortTimeout = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 30, // 30 seconds
})

// Explicitly disable (defensive)
const persistent = defineClient(routes, {
  prefixUrl: 'ws://localhost:3000',
  wsIdleTimeout: 0, // Explicitly disabled
})
```

## Config/Flags

- `wsIdleTimeout`: Idle connection timeout in seconds (default: 0 = disabled, was 10 seconds)
- Timeout only applies when `wsIdleTimeout > 0` and `activeRequests === 0`
- Unit changed from milliseconds to seconds

## Breaking/Migration

- **Breaking**: Default `wsIdleTimeout` changed from 10 seconds to 0 (disabled)
- **Migration**: Set `wsIdleTimeout: 10` to restore previous behavior
- **Unit Change**: Convert existing millisecond values to seconds (divide by 1000)
- **Compatibility**: Existing code with explicit timeout values needs unit conversion

## Tags

`websocket` `breaking-change` `idle-timeout` `connection-management` `client` `configuration`

## Evidence

- **Files Modified**: `packages/client/src/protocols/websocket.ts`, `packages/client/src/types.ts`
- **Default Change**: `wsIdleTimeout` from `10_000` (10s) to `0` (disabled)
- **Unit Change**: Timeout values now interpreted as seconds instead of milliseconds
- **Logic**: Timeout only applies when `wsIdleTimeout > 0` and no active requests
- **Benefits**: Better for real-time apps, fewer unexpected disconnections
- **Trade-offs**: May increase memory usage with many idle connections
