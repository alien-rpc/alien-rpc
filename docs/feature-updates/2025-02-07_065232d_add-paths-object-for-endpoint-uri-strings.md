# Add Paths Object for Getting Endpoint URI Strings

**Commit:** 065232d487f081e13abcfdf36076021c9b02952c  
**Author:** Alec Larson  
**Date:** Fri Feb 7 21:12:02 2025 -0500  
**Short SHA:** 065232d

## Summary

This feature adds a `paths` object to the alien-rpc client that provides a convenient way to get endpoint URI strings without making actual HTTP requests. This is useful for generating links, redirects, or any scenario where you need the URL path for a route without executing it.

## User Impact

**Audience:** Frontend developers using alien-rpc client  
**Breaking Change:** No - purely additive feature  
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### Added
- `paths` property to the client prototype that provides URI string generation
- Type-safe path generation with automatic parameter inference
- Support for both parameterized and fixed routes
- Integration with existing `pathic` library for path building

### Enhanced
- Client interface now includes comprehensive path generation capabilities
- Automatic parameter type inference from route definitions
- Seamless integration with existing client options (like `prefixUrl`)

## Usage Examples

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

### Real-World Examples

#### Navigation Links
```ts
// Generate navigation links in React
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

#### Form Actions
```ts
// Set form action URLs
function CreatePostForm({ userId }: { userId: string }) {
  return (
    <form action={client.paths.createPost({ userId })} method="POST">
      <input name="title" placeholder="Post title" />
      <input name="content" placeholder="Post content" />
      <button type="submit">Create Post</button>
    </form>
  )
}
```

#### Redirects and Navigation
```ts
// Programmatic navigation
function handleUserCreated(newUserId: string) {
  // Redirect to the new user's profile
  window.location.href = client.paths.getUser({ id: newUserId })
}

// Server-side redirects (Node.js)
function redirectToUser(res: Response, userId: string) {
  res.redirect(client.paths.getUser({ id: userId }))
}
```

#### API Documentation
```ts
// Generate API documentation with actual URLs
function generateApiDocs() {
  return {
    endpoints: {
      'Get User': {
        url: client.paths.getUser({ id: '{id}' }),
        method: 'GET',
        description: 'Retrieve user information'
      },
      'List Users': {
        url: client.paths.getUsers,
        method: 'GET', 
        description: 'Get all users'
      }
    }
  }
}
```

## Type Safety

### Automatic Parameter Inference
```ts
// TypeScript automatically infers parameter requirements
type UserPathParams = Parameters<typeof client.paths.getUser>[0]
// Result: { id: string }

type PostPathParams = Parameters<typeof client.paths.getUserPost>[0] 
// Result: { userId: string, postId: string }
```

### Compile-Time Validation
```ts
// ✅ Valid - all required parameters provided
const validUrl = client.paths.getUser({ id: '123' })

// ❌ TypeScript error - missing required parameter
const invalidUrl = client.paths.getUser()
//                                     ^
// Error: Expected 1 arguments, but got 0

// ❌ TypeScript error - wrong parameter type
const wrongType = client.paths.getUser({ id: 123 })
//                                           ^^^
// Error: Type 'number' is not assignable to type 'string'
```

### Route Without Parameters
```ts
// Routes without parameters return strings directly
const homeUrl: string = client.paths.getHome
// No function call needed

// Routes with parameters return functions
const getUserUrl: (params: { id: string }) => string = client.paths.getUser
// Function call required with parameters
```

## Implementation Details

### Client Interface Enhancement
```ts
interface ClientPrototype<API extends ClientRoutes, TErrorMode extends ErrorMode> {
  readonly request: typeof ky
  readonly options: Readonly<ClientOptions<TErrorMode>>
  readonly paths: {
    [TKey in keyof API]: InferParams<API[TKey]['path']> extends infer TParams
      ? Record<string, never> extends TParams
        ? string  // No parameters - return string directly
        : (params: TParams) => string  // Has parameters - return function
      : never
  }
  // ... other methods
}
```

### Proxy Implementation
```ts
function createPathsProxy(
  routes: Record<string, Route>,
  options: ClientOptions
) {
  return new Proxy(routes, {
    get(routes: Record<string, Route>, key: string) {
      const route = routes[key as keyof typeof routes]
      if (route) {
        if (route.pathParams.length) {
          // Return function for parameterized routes
          return (params: {}) =>
            options.prefixUrl + buildPath(route.path, params)
        }
        // Return string for fixed routes
        return options.prefixUrl + route.path
      }
    },
  })
}
```

### Path Building Logic
```ts
// Uses pathic's buildPath for parameter substitution
import { buildPath, InferParams } from 'pathic'

// Example route: '/users/:id/posts/:postId'
// buildPath('/users/:id/posts/:postId', { id: '123', postId: '456' })
// Result: '/users/123/posts/456'
```

## Integration with Existing Features

### Prefix URL Support
```ts
const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com/v1'
})

// Paths automatically include the prefix
const userUrl = client.paths.getUser({ id: '123' })
// Result: "https://api.example.com/v1/users/123"
```

### Namespace Support
```ts
// Works with namespaced routes
const adminUrl = client.paths.admin.getUsers
// Result: "https://api.example.com/admin/users"

const adminUserUrl = client.paths.admin.getUser({ id: '123' })
// Result: "https://api.example.com/admin/users/123"
```

### Route Validation
```ts
// Only valid routes are accessible
client.paths.validRoute    // ✅ Works
client.paths.invalidRoute  // ❌ TypeScript error
```

## Comparison with Alternatives

### Before: Manual URL Construction
```ts
// ❌ Error-prone manual construction
const userUrl = `${baseUrl}/users/${userId}`
const postUrl = `${baseUrl}/users/${userId}/posts/${postId}`

// ❌ No type safety
const wrongUrl = `${baseUrl}/user/${userId}` // Typo in "user"

// ❌ Parameter encoding issues
const searchUrl = `${baseUrl}/search?q=${query}` // Doesn't handle special chars
```

### After: Type-Safe Path Generation
```ts
// ✅ Type-safe and consistent
const userUrl = client.paths.getUser({ id: userId })
const postUrl = client.paths.getUserPost({ userId, postId })

// ✅ Compile-time validation
const validUrl = client.paths.getUser({ id: userId }) // ✅ Works
const invalidUrl = client.paths.getUser({ userId })   // ❌ TypeScript error

// ✅ Automatic parameter encoding via pathic
const searchUrl = client.paths.search({ q: query }) // Handles encoding
```

## Performance Considerations

### Lazy Evaluation
```ts
// Paths are generated on-demand via Proxy
// No upfront computation cost
const paths = client.paths // Instant
const userUrl = paths.getUser({ id: '123' }) // Computed when accessed
```

### Memory Efficiency
```ts
// Proxy-based implementation doesn't pre-generate all paths
// Memory usage scales with actual usage, not total routes
```

### Caching Considerations
```ts
// Each path generation is independent
// Consider caching if generating the same paths repeatedly
const userPath = client.paths.getUser
const url1 = userPath({ id: '123' }) // Fresh computation
const url2 = userPath({ id: '123' }) // Fresh computation (no caching)
```

## Use Cases

### Frontend Applications
- **React Router:** Generate route paths for navigation
- **Form Actions:** Set form submission URLs
- **Link Generation:** Create consistent navigation links
- **Breadcrumbs:** Build navigation breadcrumb trails

### Server-Side Applications
- **Redirects:** Generate redirect URLs after operations
- **Email Templates:** Include links in email notifications
- **API Documentation:** Generate example URLs
- **Webhooks:** Create callback URLs

### Testing
- **URL Validation:** Ensure correct URLs in tests
- **Mock Data:** Generate realistic URLs for fixtures
- **Integration Tests:** Verify URL generation logic

## Migration Guide

### No Breaking Changes
Existing code continues to work without modification:

```ts
// Existing client usage remains unchanged
const result = await client.getUser({ id: '123' })

// New paths feature is purely additive
const userUrl = client.paths.getUser({ id: '123' })
```

### Gradual Adoption
```ts
// Replace manual URL construction gradually

// Before
const oldUrl = `${baseUrl}/users/${userId}`

// After
const newUrl = client.paths.getUser({ id: userId })
```

### TypeScript Benefits
```ts
// Leverage TypeScript for safer refactoring
// The compiler will catch parameter mismatches

// Old manual approach
const url = `/users/${id}/posts/${postId}` // No validation

// New type-safe approach  
const url = client.paths.getUserPost({ userId: id, postId }) // Validated
```

## Dependencies

No new dependencies added. Uses existing:
- `pathic` - For path parameter inference and building
- Native `Proxy` - For dynamic property access

## References

**Files Modified:**
- `packages/client/src/client.ts` - Added paths property and createPathsProxy function

**Related Documentation:**
- [Pathic Documentation](../packages/pathic/readme.md) - Path pattern syntax and utilities
- [Client Documentation](../packages/client/readme.md) - Client usage and configuration

**External References:**
- [Proxy MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
- [TypeScript Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)

## Open Questions

**High**
- Should paths include query parameters for GET routes with search params?
- Would caching path generation functions improve performance for frequently accessed paths?

**Medium**
- Should there be a way to generate absolute URLs vs relative paths?
- Would it be useful to have a `client.urls` variant that includes query parameters?

**Low**
- Should the paths object be extensible for custom URL transformations?
- Would it be helpful to have path validation utilities for runtime checks?