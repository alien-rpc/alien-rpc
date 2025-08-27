# Add X-Route-Name Response Header Except in Production

**Commit:** 553c491ef8b44a0ccaa15473efa9f06412ad6d59  
**Author:** Alec Larson  
**Date:** Mon Feb 10 16:26:37 2025 -0500  
**Short SHA:** 553c491

## Summary

Adds an `X-Route-Name` response header to all API responses that identifies which route handler processed the request. The header is only included in non-production environments to aid in debugging while preventing information disclosure in production.

## User-Visible Changes

- **Enhanced debugging**: Route identification in development/testing environments
- **Security-conscious**: Header excluded in production to prevent information disclosure
- **Zero overhead in production**: No performance impact when deployed
- **Testing improvements**: Route verification in automated tests
- **Development tools**: Better API debugging and monitoring capabilities
- **No breaking changes**: Purely additive feature

## Examples

### Environment-Based Header Inclusion
```http
# Development/Testing
GET /api/users/123
HTTP/1.1 200 OK
X-Route-Name: getUser
Content-Type: application/json

# Production
GET /api/users/123
HTTP/1.1 200 OK
Content-Type: application/json
# No X-Route-Name header
```

### Client-Side Debugging
```ts
const response = await fetch('/api/users/123')
const routeName = response.headers.get('X-Route-Name')
console.log(`Handled by: ${routeName}`) // "getUser" in dev, null in prod
```

### Testing Integration
```ts
test('should handle user retrieval with correct route', async () => {
  const response = await fetch('/api/users/123')
  expect(response.status).toBe(200)
  expect(response.headers.get('X-Route-Name')).toBe('getUser')
})
```

### Implementation Details
```ts
// Header injection logic
if (process.env.NODE_ENV !== 'production') {
  ctx.response.headers.set('X-Route-Name', route.name)
}

// Environment behavior:
// NODE_ENV=undefined     ✅ Header included
// NODE_ENV=development   ✅ Header included  
// NODE_ENV=test          ✅ Header included
// NODE_ENV=production    ❌ Header excluded
```

## Config/Flags

No configuration required - automatically enabled based on `NODE_ENV` environment variable.

## Breaking/Migration

**Breaking Changes:** None - purely additive feature

**Migration:** No migration required - existing code continues to work unchanged

## Tags

`debugging` `development` `security` `headers` `environment-aware` `additive`

## Evidence

- Zero production overhead (header excluded)
- Minimal development overhead (~25 bytes per response)
- Enhanced debugging capabilities
- Security-conscious design
- No breaking changes to existing APIs