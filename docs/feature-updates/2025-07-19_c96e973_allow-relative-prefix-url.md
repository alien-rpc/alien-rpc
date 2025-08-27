# Allow Relative prefixUrl

**Commit:** c96e973fb2d727004dcfde640ae40bd1cee08f7b  
**Author:** Alec Larson  
**Date:** Sat Jul 19 01:21:29 2025 -0400  
**Short SHA:** c96e973

## Summary

Additive enhancement allowing `prefixUrl` client option to accept relative URLs (starting with `/`). Simplifies client configuration for same-origin API deployments by eliminating the need to specify full origin URLs.

## User-Visible Changes

- **Added**: Support for relative `prefixUrl` starting with `/`
- **Added**: Automatic resolution of relative URLs using `location.origin`
- **Added**: `resolvePrefixUrl()` utility function for URL resolution
- **Enhanced**: Client configuration flexibility with shorter URL specifications

## Examples

### Basic Relative URL Configuration
```ts
// Before: Required full URL specification
const client = createClient<Routes>({
  prefixUrl: 'https://api.example.com/v1'
})

// After: Simplified relative URL (same origin)
const client = createClient<Routes>({
  prefixUrl: '/api/v1'  // Resolves to https://current-domain.com/api/v1
})
```

### Same-Origin API Deployment
```ts
// Frontend: https://myapp.com, API: https://myapp.com/api
const client = createClient<Routes>({
  prefixUrl: '/api'  // Much cleaner than 'https://myapp.com/api'
})
```

### Environment-Aware Configuration
```ts
const client = createClient<Routes>({
  prefixUrl: process.env.NODE_ENV === 'development'
    ? '/api'  // Relative URL for same-origin development
    : 'https://api.production.com'  // Absolute URL for cross-origin production
})
```

## Config/Flags

No configuration flags required. Feature is automatically available.

## Breaking/Migration

**Breaking Change:** No - fully backward compatible  
**Migration Required:** No - existing absolute URLs continue to work unchanged

## Tags

`client` `url-resolution` `configuration` `same-origin` `relative-urls`

## Evidence

- New `resolvePrefixUrl()` utility in `packages/client/src/utils/url.ts`
- Updated HTTP client in `packages/client/src/client.ts`
- Updated WebSocket protocol in `packages/client/src/protocols/websocket.ts`
- Consistent relative URL handling across all protocols
- Automatic origin resolution for same-origin deployments