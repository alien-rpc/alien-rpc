# Remove ky Dependency

**Date:** 2025-02-16  
**Commit:** 9287eea  
**Type:** Breaking Change  
**Severity:** High  

## Summary

Breaking change that removes the `ky` HTTP client dependency and replaces it with a custom Fetch API implementation. Reduces bundle size by ~33% (~15KB), improves performance, and provides unified retry logic for HTTP and WebSocket requests.

## User-Visible Changes

- **Breaking**: ky hooks removed - Replace with custom fetch functions
- **Breaking**: ky-specific options removed - Use standard options or custom fetch
- **Breaking**: ky imports removed - Import HTTPError/TimeoutError from alien-rpc
- **Added**: Bundle size reduction - ~33% smaller (45KB → 30KB minified)
- **Added**: Custom retry logic - Configurable retry options with exponential backoff
- **Added**: Custom fetch support - Full control over request/response handling
- **Added**: Native error classes - HTTPError, TimeoutError, NetworkError with same interfaces

## Examples

### Migration from ky Hooks
```ts
// Before: ky hooks
const client = defineClient(routes, {
  hooks: {
    beforeRequest: [request => {
      request.headers.set('Authorization', `Bearer ${token}`)
    }]
  }
})

// After: custom fetch
const client = defineClient(routes, {
  fetch: async (request) => {
    request.headers.set('Authorization', `Bearer ${token}`)
    return fetch(request)
  }
})
```

### Custom Retry Configuration
```ts
const client = defineClient(routes, {
  retry: {
    limit: 3,
    methods: ['GET', 'PUT', 'DELETE'],
    statusCodes: [500, 502, 503, 504],
    delay: (attemptCount) => 1000 * attemptCount
  }
})
```

### Error Handling Changes
```ts
// Before: Import from ky
import { HTTPError, TimeoutError } from 'ky'

// After: Import from alien-rpc
import { defineClient, HTTPError, TimeoutError } from '@alien-rpc/client'

try {
  const result = await client.getData()
} catch (error) {
  if (error instanceof HTTPError) {
    console.log('Status:', error.response.status)
  }
}
```

## Config/Flags

- **retry**: `RetryOptions | number` - Configure retry behavior
- **fetch**: `(request: Request) => Promise<Response>` - Custom fetch implementation
- **headers**: `Record<string, string>` - Default headers for all requests

## Breaking/Migration

**Breaking Change:** Yes - ky dependency removed  
**Migration Required:** Yes - Replace ky hooks and imports

**Migration Steps:**
1. Remove ky dependency: `npm uninstall ky`
2. Update alien-rpc: `npm update @alien-rpc/client`
3. Replace hooks with custom fetch or headers option
4. Update error imports to use alien-rpc exports

## Tags

`breaking-change` `performance` `bundle-size` `fetch-api` `retry-logic` `error-handling` `migration-required`

## Evidence

- Bundle size reduced from ~45KB to ~30KB minified
- Native Fetch API provides better performance than ky abstraction
- Custom retry logic allows unified behavior across HTTP and WebSocket
- Error classes maintain same interface for backward compatibility
- Custom fetch functions provide more flexibility than ky hooks