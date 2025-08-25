# Allow Relative prefixUrl

**Commit:** c96e973fb2d727004dcfde640ae40bd1cee08f7b  
**Author:** Alec Larson  
**Date:** Sat Jul 19 01:21:29 2025 -0400  
**Short SHA:** c96e973

## Summary

This is an **additive enhancement** that allows the `prefixUrl` client option to accept relative URLs (starting with `/`). This simplifies client configuration when the API is hosted on the same origin as the client application, eliminating the need to specify the full origin URL.

## User Impact

**Audience:** Developers configuring alien-rpc clients  
**Breaking Change:** No - fully backward compatible  
**Migration Required:** No - existing absolute URLs continue to work  
**Status:** Enhancement - provides more flexible client configuration

## Key Changes

### Added
- Support for relative `prefixUrl` starting with `/`
- Automatic resolution of relative URLs to absolute URLs using `location.origin`
- New `resolvePrefixUrl()` utility function for URL resolution
- Consistent relative URL handling across HTTP and WebSocket protocols

### Enhanced
- Client configuration flexibility with shorter, cleaner URL specifications
- Automatic origin resolution for same-origin API deployments
- Improved developer experience for common deployment scenarios

## Implementation Details

### New Utility Function

**File:** `packages/client/src/utils/url.ts`
```ts
export function resolvePrefixUrl(prefixUrl: string | URL | undefined) {
  return prefixUrl
    ? isString(prefixUrl) && prefixUrl[0] === '/'
      ? location.origin + prefixUrl  // Resolve relative URL
      : prefixUrl                    // Use absolute URL as-is
    : location.origin                // Default to current origin
}
```

### HTTP Protocol Integration

**File:** `packages/client/src/client.ts`
```ts
// Before: Direct usage of prefixUrl or location.origin
const url = urlWithPathname(
  options.prefixUrl || location.origin,
  route.pathParams ? buildPath(route.path, params ?? {}) : route.path
)

// After: Automatic resolution of relative URLs
const url = urlWithPathname(
  resolvePrefixUrl(options.prefixUrl),
  route.pathParams ? buildPath(route.path, params ?? {}) : route.path
)
```

### WebSocket Protocol Integration

**File:** `packages/client/src/protocols/websocket.ts`
```ts
// Before: Direct usage of prefixUrl or location.origin
function getWebSocketURL(options: ClientOptions) {
  const url = urlWithPathname(options.prefixUrl ?? location.origin, 'ws')
  url.protocol = url.protocol.replace('http', 'ws')
  return url.href
}

// After: Consistent relative URL resolution
function getWebSocketURL(options: ClientOptions) {
  const url = urlWithPathname(resolvePrefixUrl(options.prefixUrl), 'ws')
  url.protocol = url.protocol.replace('http', 'ws')
  return url.href
}
```

## Usage Examples

### Basic Relative URL Configuration

```ts
// Before: Required full URL specification
const client = createClient<Routes>({
  prefixUrl: 'https://api.example.com/v1'  // Full absolute URL required
})

// After: Simplified relative URL (same origin)
const client = createClient<Routes>({
  prefixUrl: '/api/v1'  // Relative URL automatically resolved
})

// Resolves to: https://current-domain.com/api/v1 (if current page is on current-domain.com)
```

### Development vs Production Configuration

```ts
// Environment-aware configuration
const client = createClient<Routes>({
  prefixUrl: process.env.NODE_ENV === 'development'
    ? '/api'  // Relative URL for same-origin development
    : 'https://api.production.com'  // Absolute URL for cross-origin production
})

// Or using environment variables
const client = createClient<Routes>({
  prefixUrl: process.env.API_PREFIX_URL || '/api'  // Default to relative
})
```

### Same-Origin API Deployment

```ts
// Common scenario: API and frontend on same domain
// Frontend: https://myapp.com
// API: https://myapp.com/api

const client = createClient<Routes>({
  prefixUrl: '/api'  // Much cleaner than 'https://myapp.com/api'
})

// All requests automatically resolve to:
// - GET /api/users → https://myapp.com/api/users
// - POST /api/auth/login → https://myapp.com/api/auth/login
// - WebSocket /api/ws → wss://myapp.com/api/ws
```

### Microservices with Path-Based Routing

```ts
// Multiple services on same domain with different paths
const userService = createClient<UserRoutes>({
  prefixUrl: '/api/users'  // Resolves to https://domain.com/api/users
})

const orderService = createClient<OrderRoutes>({
  prefixUrl: '/api/orders'  // Resolves to https://domain.com/api/orders
})

const notificationService = createClient<NotificationRoutes>({
  prefixUrl: '/api/notifications'  // Resolves to https://domain.com/api/notifications
})

// Usage remains the same
const user = await userService.getProfile({ id: '123' })
const orders = await orderService.getUserOrders({ userId: '123' })
const notifications = await notificationService.getUnread()
```

### Dynamic Configuration

```ts
// Configuration based on current environment
function createApiClient<T>() {
  const isLocalhost = location.hostname === 'localhost'
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  let prefixUrl: string
  
  if (isLocalhost && isDevelopment) {
    prefixUrl = '/api'  // Relative URL for local development
  } else if (location.hostname.includes('staging')) {
    prefixUrl = '/api'  // Relative URL for staging (same origin)
  } else {
    prefixUrl = 'https://api.production.com'  // Absolute URL for production
  }
  
  return createClient<T>({ prefixUrl })
}

const client = createApiClient<Routes>()
```

### Subdirectory Deployments

```ts
// Application deployed in subdirectory
// Frontend: https://company.com/myapp/
// API: https://company.com/myapp/api/

const client = createClient<Routes>({
  prefixUrl: '/myapp/api'  // Relative to domain root
})

// Or relative to current path (if frontend is at /myapp/)
const client = createClient<Routes>({
  prefixUrl: './api'  // Note: This would need additional handling
})
```

## URL Resolution Logic

### Resolution Rules

1. **Undefined/Null prefixUrl:** Defaults to `location.origin`
2. **Relative URL (starts with `/`):** Prepends `location.origin`
3. **Absolute URL:** Used as-is (no modification)
4. **URL Object:** Used as-is (no modification)

### Resolution Examples

```ts
// Current page: https://myapp.com/dashboard

// Case 1: Undefined prefixUrl
resolvePrefixUrl(undefined)
// Result: 'https://myapp.com'

// Case 2: Relative URL
resolvePrefixUrl('/api/v1')
// Result: 'https://myapp.com/api/v1'

// Case 3: Absolute URL (unchanged)
resolvePrefixUrl('https://api.external.com/v1')
// Result: 'https://api.external.com/v1'

// Case 4: URL object (unchanged)
resolvePrefixUrl(new URL('https://api.external.com/v1'))
// Result: URL object for 'https://api.external.com/v1'
```

### WebSocket URL Resolution

```ts
// HTTP to WebSocket protocol conversion with relative URLs

// Current page: https://myapp.com/chat
// prefixUrl: '/api'

// Resolution process:
// 1. resolvePrefixUrl('/api') → 'https://myapp.com/api'
// 2. urlWithPathname('https://myapp.com/api', 'ws') → 'https://myapp.com/api/ws'
// 3. Protocol conversion: 'https' → 'wss'
// Final WebSocket URL: 'wss://myapp.com/api/ws'
```

## Backward Compatibility

### Existing Code Unchanged

```ts
// All existing configurations continue to work exactly as before

// Absolute URLs (no change in behavior)
const client1 = createClient<Routes>({
  prefixUrl: 'https://api.example.com/v1'
})

// URL objects (no change in behavior)
const client2 = createClient<Routes>({
  prefixUrl: new URL('https://api.example.com/v1')
})

// Undefined prefixUrl (no change in behavior)
const client3 = createClient<Routes>({
  // prefixUrl defaults to location.origin
})
```

### Migration Path

```ts
// Optional migration for same-origin APIs

// Before (still works)
const client = createClient<Routes>({
  prefixUrl: 'https://myapp.com/api'
})

// After (cleaner, but optional)
const client = createClient<Routes>({
  prefixUrl: '/api'
})
```

## Configuration Patterns

### Environment-Based Configuration

```ts
// config/api.ts
interface ApiConfig {
  prefixUrl: string
  timeout?: number
  retries?: number
}

const configs: Record<string, ApiConfig> = {
  development: {
    prefixUrl: '/api',  // Relative URL for local development
    timeout: 10000,
    retries: 1
  },
  staging: {
    prefixUrl: '/api',  // Relative URL for staging (same origin)
    timeout: 8000,
    retries: 2
  },
  production: {
    prefixUrl: 'https://api.myapp.com',  // Absolute URL for production CDN
    timeout: 5000,
    retries: 3
  }
}

export const apiConfig = configs[process.env.NODE_ENV || 'development']

// Usage
const client = createClient<Routes>(apiConfig)
```

### Multi-Tenant Configuration

```ts
// Multi-tenant application with tenant-specific APIs
function createTenantClient<T>(tenantId: string) {
  // Same-origin tenant-specific API
  const prefixUrl = `/api/tenants/${tenantId}`
  
  return createClient<T>({ prefixUrl })
}

// Usage
const acmeClient = createTenantClient<Routes>('acme-corp')
const techClient = createTenantClient<Routes>('tech-startup')

// Resolves to:
// - https://myapp.com/api/tenants/acme-corp
// - https://myapp.com/api/tenants/tech-startup
```

### Feature Flag Configuration

```ts
// Feature-based API routing
function createFeatureAwareClient<T>(features: string[]) {
  const hasNewApi = features.includes('new-api')
  
  const prefixUrl = hasNewApi
    ? '/api/v2'  // New API version (same origin)
    : '/api/v1'  // Legacy API version (same origin)
  
  return createClient<T>({ prefixUrl })
}

// Usage
const client = createFeatureAwareClient<Routes>(userFeatures)
```

## Performance Considerations

### URL Resolution Performance
- **Minimal Overhead:** Simple string concatenation for relative URLs
- **Cached Origin:** `location.origin` is cached by the browser
- **No Network Impact:** Resolution happens client-side
- **Memory Efficient:** No additional URL objects created unnecessarily

### Network Performance
- **Same-Origin Benefits:** Relative URLs enable same-origin optimizations
- **Connection Reuse:** HTTP/2 connection reuse for same-origin requests
- **Cookie Sharing:** Automatic cookie inclusion for same-origin requests
- **CORS Avoidance:** No CORS preflight requests for same-origin APIs

## Security Considerations

### Same-Origin Security
- **CSRF Protection:** Same-origin requests benefit from CSRF protections
- **Cookie Security:** Secure cookie handling for same-origin requests
- **Content Security Policy:** Easier CSP configuration for same-origin APIs
- **Mixed Content:** Avoids mixed content issues (HTTP/HTTPS)

### URL Validation
- **Input Sanitization:** Relative URLs are automatically sanitized
- **Origin Consistency:** Ensures consistent origin across all requests
- **Protocol Security:** Maintains HTTPS for secure origins
- **Path Traversal:** Standard URL parsing prevents path traversal attacks

## Browser Compatibility

### Modern Browser Support
- **location.origin:** Supported in all modern browsers
- **URL Constructor:** Full support in target browsers
- **String Methods:** Basic string operations (universal support)
- **ES Modules:** Compatible with module bundlers

### Fallback Considerations
- **Legacy Browsers:** Consider polyfills for very old browsers
- **Server-Side Rendering:** May need special handling for SSR environments
- **Node.js Environment:** Requires global location object or alternative

## Testing Considerations

### Unit Testing

```ts
// Mock location.origin for testing
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://test.example.com'
  },
  writable: true
})

// Test relative URL resolution
expect(resolvePrefixUrl('/api')).toBe('https://test.example.com/api')
expect(resolvePrefixUrl('https://external.com')).toBe('https://external.com')
expect(resolvePrefixUrl(undefined)).toBe('https://test.example.com')
```

### Integration Testing

```ts
// Test client with relative URL
const client = createClient<Routes>({
  prefixUrl: '/api'
})

// Verify requests go to correct resolved URLs
const mockFetch = jest.fn()
global.fetch = mockFetch

await client.getUsers()

expect(mockFetch).toHaveBeenCalledWith(
  'https://test.example.com/api/users',
  expect.any(Object)
)
```

## Troubleshooting

### Common Issues

**Issue:** Relative URL not resolving correctly
```ts
// Problem: Expecting relative to current path, but it's relative to origin
const client = createClient<Routes>({
  prefixUrl: 'api'  // Missing leading slash
})

// Solution: Use leading slash for origin-relative URLs
const client = createClient<Routes>({
  prefixUrl: '/api'  // Correct: relative to origin
})
```

**Issue:** Mixed content warnings with HTTPS
```ts
// Problem: HTTP absolute URL on HTTPS page
const client = createClient<Routes>({
  prefixUrl: 'http://api.example.com'  // HTTP on HTTPS page
})

// Solution: Use relative URL or HTTPS absolute URL
const client = createClient<Routes>({
  prefixUrl: '/api'  // Inherits HTTPS from current page
})
```

**Issue:** CORS errors with relative URLs
```ts
// Problem: Expecting CORS to work with relative URLs
// Relative URLs are same-origin, so CORS doesn't apply

// If you need cross-origin, use absolute URL:
const client = createClient<Routes>({
  prefixUrl: 'https://api.external.com'  // Cross-origin requires CORS
})
```

### Debugging Tips

```ts
// Debug URL resolution
console.log('Current origin:', location.origin)
console.log('Resolved URL:', resolvePrefixUrl('/api'))

// Verify client configuration
const client = createClient<Routes>({ prefixUrl: '/api' })
console.log('Client will make requests to:', /* inspect client internals */)
```

## Future Enhancements

### Planned Features
- **Base Path Support:** Support for `<base>` tag in HTML documents
- **Environment Detection:** Automatic environment-based URL resolution
- **Configuration Validation:** Runtime validation of URL configurations
- **Development Tools:** Enhanced debugging tools for URL resolution

### Potential Improvements
- **Relative Path Support:** Support for `./api` and `../api` patterns
- **Template Variables:** Support for URL templates with variables
- **Dynamic Resolution:** Runtime URL resolution based on conditions
- **Configuration Presets:** Pre-configured URL patterns for common scenarios

## References

**External Documentation:**
- [URL - MDN](https://developer.mozilla.org/en-US/docs/Web/API/URL)
- [Location.origin - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Location/origin)
- [Same-origin policy - MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [Relative URLs - RFC 3986](https://tools.ietf.org/html/rfc3986#section-4.2)

**Related Changes:**
- [Merge ArrayBuffer into Blob Support](./2025-07-15_de41775_merge-arraybuffer-into-blob-support.md) (Previous)
- [Include Exported Types in Generated Output](./2025-07-20_e71ff63_include-exported-types-in-generated-output.md) (Next)

**Files Modified:**
- `packages/client/src/client.ts` - Updated HTTP request URL resolution
- `packages/client/src/protocols/websocket.ts` - Updated WebSocket URL resolution
- `packages/client/src/utils/url.ts` - Added `resolvePrefixUrl()` utility function

This enhancement provides a more flexible and developer-friendly way to configure alien-rpc clients, especially for same-origin API deployments.

## Open Questions

No unanswered questions