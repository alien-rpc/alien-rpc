# Support Namespaces

**Commit:** f449319277261a150c15d7aa1ef48792d0e6f89e  
**Author:** Alec Larson  
**Date:** Wed Feb 12 14:53:40 2025 -0500  
**Short SHA:** f449319

## Summary

This feature adds support for organizing routes using TypeScript namespaces. Routes declared within `export namespace` blocks are automatically grouped in the generated client, allowing for better API organization and cleaner client code structure.

## User Impact

**Audience:** All users who want to organize their API routes into logical groups  
**Breaking Change:** No - purely additive feature  
**Migration Required:** No - existing routes continue to work unchanged

## Key Changes

### Added
- Support for `export namespace` blocks in route files
- Automatic namespace detection in route analysis
- Nested client method generation for namespaced routes
- Updated type system to support nested route structures

### Enhanced
- `ClientRoutes` type now supports nested route objects
- Route analysis now traverses namespace declarations
- Client generator creates namespace-aware method definitions

## Usage Examples

### Server-Side Route Declaration

**Before (Flat Structure):**
```ts
// routes/api.ts
export const getBilling = route.get('/billing', async () => {
  return await fetchBillingInfo()
})

export const updateBilling = route.post('/billing', async (data) => {
  return await updateBillingInfo(data)
})

export const getProfile = route.get('/profile', async () => {
  return await fetchUserProfile()
})

export const updateProfile = route.post('/profile', async (data) => {
  return await updateUserProfile(data)
})
```

**After (Namespace Organization):**
```ts
// routes/api.ts
export namespace account {
  export const getBilling = route.get('/billing', async () => {
    return await fetchBillingInfo()
  })

  export const updateBilling = route.post('/billing', async (data) => {
    return await updateBillingInfo(data)
  })

  export const getProfile = route.get('/profile', async () => {
    return await fetchUserProfile()
  })

  export const updateProfile = route.post('/profile', async (data) => {
    return await updateUserProfile(data)
  })
}

export namespace admin {
  export const getUsers = route.get('/admin/users', async () => {
    return await fetchAllUsers()
  })

  export const deleteUser = route.delete('/admin/users/:id', async (id) => {
    return await deleteUserById(id)
  })
}
```

### Client-Side Usage

**Before (Flat Client Methods):**
```ts
import { createClient } from '@alien-rpc/client'
import * as api from './generated/api'

const client = createClient(api, { baseURL: 'https://api.example.com' })

// All methods at top level
const billing = await client.getBilling()
const profile = await client.getProfile()
const users = await client.getUsers()
```

**After (Namespaced Client Methods):**
```ts
import { createClient } from '@alien-rpc/client'
import * as api from './generated/api'

const client = createClient(api, { baseURL: 'https://api.example.com' })

// Organized by namespace
const billing = await client.account.getBilling()
const profile = await client.account.getProfile()
const users = await client.admin.getUsers()
```

## Generated Client Structure

### Type Definitions
The generated client now supports nested structures:

```ts
// Generated api.ts
export namespace account {
  export const getBilling: Route<"/billing", () => Promise<BillingInfo>
  export const updateBilling: Route<"/billing", (data: BillingData) => Promise<void>
  export const getProfile: Route<"/profile", () => Promise<UserProfile>
  export const updateProfile: Route<"/profile", (data: ProfileData) => Promise<void>
}

export namespace admin {
  export const getUsers: Route<"/admin/users", () => Promise<User[]>
  export const deleteUser: Route<"/admin/users/:id", (id: string) => Promise<void>
}
```

### Client Interface
The client automatically creates nested method access:

```ts
type Client = {
  account: {
    getBilling(): Promise<BillingInfo>
    updateBilling(data: BillingData): Promise<void>
    getProfile(): Promise<UserProfile>
    updateProfile(data: ProfileData): Promise<void>
  }
  admin: {
    getUsers(): Promise<User[]>
    deleteUser(id: string): Promise<void>
  }
}
```

## Advanced Usage

### Mixed Namespace and Top-Level Routes
```ts
// You can mix namespaced and top-level routes
export const healthCheck = route.get('/health', async () => {
  return { status: 'ok' }
})

export namespace v1 {
  export const getUser = route.get('/v1/users/:id', async (id) => {
    return await fetchUser(id)
  })
}

export namespace v2 {
  export const getUser = route.get('/v2/users/:id', async (id) => {
    return await fetchUserV2(id)
  })
}
```

```ts
// Client usage
const health = await client.healthCheck()
const userV1 = await client.v1.getUser('123')
const userV2 = await client.v2.getUser('123')
```

### Nested Namespaces
```ts
// Nested namespaces are supported
export namespace api {
  export namespace v1 {
    export const getUser = route.get('/api/v1/users/:id', async (id) => {
      return await fetchUser(id)
    })
  }
}

// Client usage
const user = await client.api.v1.getUser('123')
```

## Benefits

### Better Organization
- **Logical grouping** - related routes are grouped together
- **Cleaner imports** - namespace-based organization
- **Scalable structure** - easier to manage large APIs

### Improved Developer Experience
- **Better autocomplete** - IDE can suggest methods by category
- **Clearer intent** - namespace names provide context
- **Reduced naming conflicts** - same method names in different namespaces

### Type Safety
- **Full type inference** - namespaces preserve all type information
- **Compile-time validation** - TypeScript catches namespace errors
- **IntelliSense support** - full IDE support for nested structures

## Migration Guide

### Gradual Adoption
You can gradually migrate to namespaces without breaking existing code:

1. **Keep existing routes** - they continue to work at the top level
2. **Add new routes in namespaces** - organize new features by namespace
3. **Refactor incrementally** - move related routes into namespaces over time

### Refactoring Example
```ts
// Step 1: Keep existing routes
export const getUser = route.get('/users/:id', handler)

// Step 2: Add new routes in namespaces
export namespace admin {
  export const deleteUser = route.delete('/admin/users/:id', handler)
}

// Step 3: Eventually move related routes together
export namespace users {
  export const getUser = route.get('/users/:id', handler)
  export const deleteUser = route.delete('/admin/users/:id', handler)
}
```

## Configuration

No configuration changes required. Namespace support is automatically detected and processed.

## Dependencies

No new dependencies added. Uses existing TypeScript namespace features.

## References

**Files Modified:**
- `packages/client/src/client.ts` - Updated client creation for nested routes
- `packages/client/src/types.ts` - Added support for nested route types
- `packages/generator/src/generator.ts` - Enhanced client generation for namespaces
- `packages/generator/src/project/analyze-file.ts` - Added namespace traversal

**Related Documentation:**
- [Route Organization Guide](../packages/service/docs/route-organization.md)
- [Client Usage Documentation](../packages/client/readme.md)
- [TypeScript Namespace Guide](../docs/typescript-namespaces.md)

## Open Questions

**High**
- Should there be any limitations on namespace nesting depth?
- Are there any performance implications of deeply nested namespace structures?

**Medium**
- Should the generator provide warnings for namespace naming conflicts?
- Would it be helpful to have utilities for dynamically accessing namespaced routes?

**Low**
- Should there be documentation examples for common namespace organization patterns?
- Are there any edge cases with namespace exports that need special handling?