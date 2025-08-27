# Add Paths Object for Getting Endpoint URI Strings

**Commit:** 065232d487f081e13abcfdf36076021c9b02952c  
**Author:** Alec Larson  
**Date:** Fri Feb 7 21:12:02 2025 -0500  
**Short SHA:** 065232d

## Summary

Added a `paths` object to the alien-rpc client that provides a convenient way to get endpoint URI strings without making actual HTTP requests. This is useful for generating links, redirects, or any scenario where you need the URL path for a route without executing it.

## User-Visible Changes

- **Type-Safe Path Generation:** Automatic parameter inference from route definitions
- **Convenient URL Building:** Get endpoint URIs without making HTTP requests
- **Prefix URL Support:** Paths automatically include configured prefix URLs
- **Parameter Validation:** Compile-time validation of required parameters
- **Namespace Support:** Works with namespaced routes
- **No Breaking Changes:** Purely additive feature

## Examples

### Basic Usage
```ts
import { defineClient } from '@alien-rpc/client'
import * as routes from './generated/api'

const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com'
})

// For routes without parameters
const userListUrl = client.paths.getUsers
// Result: "https://api.example.com/users"

// For routes with parameters
const userUrl = client.paths.getUser({ id: '123' })
// Result: "https://api.example.com/users/123"
```

### Navigation Links
```ts
function UserNavigation({ userId }: { userId: string }) {
  return (
    <nav>
      <Link to={client.paths.getUser({ id: userId })}>
        View Profile
      </Link>
      <Link to={client.paths.getUserPosts({ id: userId })}>
        View Posts
      </Link>
      <Link to={client.paths.getUsers}>
        All Users
      </Link>
    </nav>
  )
}
```

### Type Safety
```ts
// ✅ Valid - all required parameters provided
const validUrl = client.paths.getUser({ id: '123' })

// ❌ TypeScript error - missing required parameter
const invalidUrl = client.paths.getUser()

// ❌ TypeScript error - wrong parameter type
const wrongType = client.paths.getUser({ id: 123 })
```

### Implementation
```ts
// Proxy-based implementation for dynamic property access
function createPathsProxy(routes: Record<string, Route>, options: ClientOptions) {
  return new Proxy(routes, {
    get(routes, key: string) {
      const route = routes[key]
      if (route) {
        if (route.pathParams.length) {
          // Return function for parameterized routes
          return (params: {}) => options.prefixUrl + buildPath(route.path, params)
        }
        // Return string for fixed routes
        return options.prefixUrl + route.path
      }
    },
  })
}
```

## Config/Flags

No new configuration options - uses existing client options like `prefixUrl`.

## Breaking/Migration

**Breaking Change:** No - purely additive feature  
**Migration Required:** No - existing code continues to work unchanged

## Tags

- URL generation
- Type safety
- Client enhancement
- Navigation
- Path building

## Evidence

**Files Modified:** `packages/client/src/client.ts`  
**Dependencies:** Uses existing `pathic` and native `Proxy`  
**Type Safety:** Automatic parameter inference and compile-time validation  
**Performance:** Lazy evaluation via Proxy, memory efficient