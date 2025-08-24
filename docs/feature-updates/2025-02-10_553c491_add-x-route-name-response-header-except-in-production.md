# Add X-Route-Name Response Header Except in Production

**Commit:** 553c491ef8b44a0ccaa15473efa9f06412ad6d59  
**Author:** Alec Larson  
**Date:** Mon Feb 10 16:26:37 2025 -0500  
**Short SHA:** 553c491

## Summary

This feature adds an `X-Route-Name` response header to all API responses that identifies which route handler processed the request. The header is only included in non-production environments to aid in debugging and development while avoiding potential information disclosure in production.

## User Impact

**Audience:** API developers and frontend developers debugging API calls  
**Breaking Change:** No - purely additive feature  
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### Added
- `X-Route-Name` response header containing the route name
- Environment-based conditional header inclusion (excluded in production)
- Enhanced debugging capabilities for development and testing

### Enhanced
- Route compilation now includes route name in compiled route objects
- Responders updated to handle response header context
- Improved error handling with header propagation

## Usage Examples

### Development Environment Response
```http
GET /api/users/123
Host: localhost:3000

HTTP/1.1 200 OK
Content-Type: application/json
X-Route-Name: getUser
Content-Length: 85

{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Production Environment Response
```http
GET /api/users/123
Host: api.example.com

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 85

{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Debugging with Browser DevTools
```js
// In browser console, inspect response headers
fetch('/api/users/123')
  .then(response => {
    console.log('Route:', response.headers.get('X-Route-Name'))
    // Output in development: "Route: getUser"
    // Output in production: "Route: null"
    return response.json()
  })
```

### Client-Side Route Identification
```ts
// Identify which route handled the request
async function debugApiCall(url: string) {
  const response = await fetch(url)
  const routeName = response.headers.get('X-Route-Name')
  
  if (routeName) {
    console.log(`Request handled by route: ${routeName}`)
  } else {
    console.log('Route name not available (production mode)')
  }
  
  return response.json()
}

// Usage
const userData = await debugApiCall('/api/users/123')
// Development output: "Request handled by route: getUser"
```

### Testing and Validation
```ts
// Verify correct route handling in tests
import { expect, test } from 'vitest'

test('should handle user retrieval with correct route', async () => {
  const response = await fetch('/api/users/123')
  
  expect(response.status).toBe(200)
  expect(response.headers.get('X-Route-Name')).toBe('getUser')
  
  const user = await response.json()
  expect(user.id).toBe('123')
})

test('should handle user creation with correct route', async () => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Jane Doe', email: 'jane@example.com' })
  })
  
  expect(response.status).toBe(201)
  expect(response.headers.get('X-Route-Name')).toBe('createUser')
})
```

### API Monitoring and Logging
```ts
// Log route usage for analytics
function logApiUsage(request: Request, response: Response) {
  const routeName = response.headers.get('X-Route-Name')
  
  if (routeName) {
    console.log({
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      route: routeName,
      status: response.status,
      duration: performance.now() - startTime
    })
  }
}
```

## Environment Behavior

### Development Environment
```bash
# NODE_ENV=development or undefined
curl -i http://localhost:3000/api/users/123

HTTP/1.1 200 OK
Content-Type: application/json
X-Route-Name: getUser  # ✅ Header present
```

### Testing Environment
```bash
# NODE_ENV=test
curl -i http://localhost:3000/api/users/123

HTTP/1.1 200 OK
Content-Type: application/json
X-Route-Name: getUser  # ✅ Header present
```

### Production Environment
```bash
# NODE_ENV=production
curl -i https://api.example.com/api/users/123

HTTP/1.1 200 OK
Content-Type: application/json
# ❌ X-Route-Name header not present
```

### Environment Detection Logic
```ts
// Header is added when NOT in production
if (process.env.NODE_ENV !== 'production') {
  ctx.response.headers.set('X-Route-Name', route.name)
}

// Examples of when header is included:
// NODE_ENV=undefined     ✅ Header included
// NODE_ENV=development   ✅ Header included  
// NODE_ENV=test          ✅ Header included
// NODE_ENV=staging       ✅ Header included
// NODE_ENV=production    ❌ Header excluded
```

## Implementation Details

### Route Compilation Enhancement
```ts
// compileRoute.ts - Route name added to compiled route
export function compileRoute(route: Route, options: CompileRouteOptions = {}) {
  return {
    method: route.method,
    path: route.path,
    name: route.name,  // ✅ Added route name
    // ... other properties
  }
}
```

### Header Injection Logic
```ts
// compileRoutes.ts - Header added during route matching
return await matchRoute(url.pathname, async (route, params) => {
  // Add X-Route-Name header in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    ctx.response.headers.set('X-Route-Name', route.name)
  }

  step = RequestStep.Validate
  const args = await route.getHandlerArgs(params, ctx)

  step = RequestStep.Respond
  return await route.responder(args, ctx)
})
```

### Error Response Header Propagation
```ts
// Error responses also include the header
catch (error: any) {
  const response = handleRouteError(error, step)
  
  // Propagate headers from context to error response
  for (const [name, value] of ctx.response.headers) {
    response.headers.set(name, value)
  }
  
  return response
}
```

### Responder Integration
```ts
// All responders now receive and use the response context
const responder: RouteResponder = route => async (args, ctx) => {
  const routeDef = await importRouteDefinition(route)
  
  // Process the request...
  let result = await routeDef.handler.apply(routeDef, args)
  
  // Return response with context headers (including X-Route-Name)
  return new Response(result, ctx.response)
}
```

## Security Considerations

### Information Disclosure Prevention
```ts
// Production environment excludes route names
if (process.env.NODE_ENV !== 'production') {
  ctx.response.headers.set('X-Route-Name', route.name)
}

// Prevents potential information leakage:
// ❌ Attackers can't enumerate route names in production
// ❌ Internal API structure not exposed
// ❌ Route naming conventions not revealed
```

### Development vs Production
```ts
// Development: Full debugging information
// X-Route-Name: getUserById
// X-Route-Name: admin.deleteUser
// X-Route-Name: internal.systemHealth

// Production: No route information disclosed
// (no X-Route-Name header)
```

### Header Sanitization
```ts
// Route names are used directly from route definitions
// Ensure route names don't contain sensitive information

// ✅ Good route names
// getUser, createPost, updateProfile

// ❌ Avoid sensitive route names
// getSecretKey, adminBackdoor, debugInternalState
```

## Debugging Benefits

### Route Resolution Debugging
```ts
// Verify correct route matching
const response = await fetch('/api/users/123')
const routeName = response.headers.get('X-Route-Name')

if (routeName !== 'getUser') {
  console.error(`Expected 'getUser' route, got '${routeName}'`)
}
```

### API Gateway Integration
```ts
// API gateways can log route information
function logRequest(request: Request, response: Response) {
  const routeName = response.headers.get('X-Route-Name')
  
  logger.info({
    path: request.url,
    method: request.method,
    route: routeName,
    status: response.status,
    timestamp: Date.now()
  })
}
```

### Load Testing and Performance
```ts
// Identify performance bottlenecks by route
const performanceData = new Map<string, number[]>()

function trackPerformance(request: Request, response: Response, duration: number) {
  const routeName = response.headers.get('X-Route-Name')
  
  if (routeName) {
    if (!performanceData.has(routeName)) {
      performanceData.set(routeName, [])
    }
    performanceData.get(routeName)!.push(duration)
  }
}

// Analyze performance by route
for (const [route, durations] of performanceData) {
  const avg = durations.reduce((a, b) => a + b) / durations.length
  console.log(`Route ${route}: avg ${avg}ms`)
}
```

### Frontend Development Tools
```ts
// Browser extension for API debugging
function createApiDebugger() {
  const originalFetch = window.fetch
  
  window.fetch = async (...args) => {
    const response = await originalFetch(...args)
    const routeName = response.headers.get('X-Route-Name')
    
    if (routeName) {
      console.group(`🔍 API Call: ${routeName}`)
      console.log('URL:', args[0])
      console.log('Status:', response.status)
      console.log('Route:', routeName)
      console.groupEnd()
    }
    
    return response
  }
}
```

## Use Cases

### Development and Debugging
- **Route Verification:** Confirm correct route handling during development
- **API Exploration:** Understand which routes handle specific requests
- **Integration Testing:** Validate route resolution in automated tests
- **Performance Profiling:** Identify slow routes and optimization targets

### Monitoring and Analytics
- **Usage Tracking:** Monitor which routes are most frequently used
- **Error Analysis:** Correlate errors with specific route handlers
- **Load Distribution:** Understand traffic patterns across routes
- **API Evolution:** Track route usage before deprecation

### Team Collaboration
- **Code Reviews:** Verify route implementations match specifications
- **Documentation:** Generate API documentation with actual route names
- **Onboarding:** Help new developers understand API structure
- **Troubleshooting:** Quickly identify problematic routes in logs

## Migration Guide

### No Breaking Changes
Existing code continues to work without modification:

```ts
// Existing API calls work unchanged
const response = await fetch('/api/users/123')
const user = await response.json()

// New header is simply available for inspection
const routeName = response.headers.get('X-Route-Name')
```

### Gradual Enhancement
```ts
// Add debugging capabilities incrementally

// Basic usage (no changes needed)
const user = await client.getUser({ id: '123' })

// Enhanced debugging (optional)
const response = await fetch('/api/users/123')
const routeName = response.headers.get('X-Route-Name')
console.log(`Handled by: ${routeName}`)
const user = await response.json()
```

### Testing Integration
```ts
// Enhance existing tests with route verification

// Before: Basic functionality test
test('should get user', async () => {
  const response = await fetch('/api/users/123')
  expect(response.status).toBe(200)
})

// After: Enhanced with route verification
test('should get user via correct route', async () => {
  const response = await fetch('/api/users/123')
  expect(response.status).toBe(200)
  expect(response.headers.get('X-Route-Name')).toBe('getUser')
})
```

## Performance Impact

### Header Overhead
```ts
// Minimal performance impact
// - Single header addition: ~20-30 bytes per response
// - Only in non-production environments
// - No computational overhead
```

### Memory Usage
```ts
// Negligible memory impact
// - Route name already exists in route definition
// - Header string is temporary (garbage collected after response)
// - No persistent storage of header data
```

### Network Impact
```ts
// Minimal network overhead
// Example header: "X-Route-Name: getUserById" (~25 bytes)
// Typical response: 1KB+ (header is <3% overhead)
// Production: No overhead (header excluded)
```

## Dependencies

No new dependencies added. Uses existing:
- Native `Headers` API for header manipulation
- Existing route compilation infrastructure
- Standard environment variable checking

## References

**Files Modified:**
- `packages/service/src/compileRoute.ts` - Added route name to compiled route
- `packages/service/src/compileRoutes.ts` - Added header injection logic
- `packages/service/src/importRouteDefinition.ts` - New utility for route definition import
- `packages/service/src/responders/index.ts` - Updated responders for header context
- `packages/service/src/responders/json.ts` - Updated JSON responder
- `packages/service/src/responders/json-seq.ts` - Updated JSON sequence responder
- `packages/service/src/types.ts` - Updated type definitions
- `packages/generator/src/generator.ts` - Updated generator integration

**Related Documentation:**
- [HTTP Headers MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [Custom Headers Best Practices](https://tools.ietf.org/html/rfc6648)

**External References:**
- [X-* Header Convention](https://tools.ietf.org/html/rfc6648) - Custom header naming
- [HTTP Response Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) - Standard headers
- [Node.js Environment Variables](https://nodejs.org/api/process.html#process_process_env) - NODE_ENV usage

## Open Questions

**High**
- Should the header name be configurable (e.g., `X-Custom-Route-Name`)?
- Would it be useful to include additional route metadata (method, path pattern)?

**Medium**
- Should there be a way to disable the header in specific non-production environments?
- Would route timing information be valuable in the header?

**Low**
- Should the feature support custom header formatters?
- Would namespace information be useful in the route name header?