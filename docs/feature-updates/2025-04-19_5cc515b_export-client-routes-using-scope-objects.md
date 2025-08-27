# Export Client Routes Using Scope Objects

**Commit:** 5cc515b  
**Date:** April 19, 2025  
**Type:** Breaking Change  
**Breaking Change:** ⚠️ Yes - Changes client route import structure

## Summary

Breaking change that replaces TypeScript namespace exports with scope objects in generated client code. Uses `export default { ... }` for default scope and `export const <name> = { ... }` for namespaced routes. Resolves enum type issues with `defineClient` and provides consistent import experience.

## User-Visible Changes

- **Import syntax**: Changed from `import * as api` to `import api` (default export)
- **Namespace handling**: Namespaced routes require explicit import and merging
- **Enum compatibility**: Fixed enum type issues when calling `defineClient`
- **Generated structure**: Routes exported as object properties instead of individual exports

## Examples

### Basic Import Change
```typescript
// Before
import * as api from './generated/api.ts'
const client = defineClient(api)

// After
import api from './generated/api.ts'
const client = defineClient(api)
```

### Namespace Handling
```typescript
// Separate clients
import api, { admin } from './generated/api.ts'
const client = defineClient(api)
const adminClient = defineClient(admin)

// Merged client
import api, { admin } from './generated/api.ts'
const client = defineClient({ ...api, admin })
const users = await client.admin.getUsers()
```

### Generated Code Structure
```typescript
// Generated output
export default {
  getUser: { path: "users/:id", method: "GET" } as Route<...>,
  createUser: { path: "users", method: "POST" } as Route<...>
}

export const admin = {
  getUsers: { path: "admin/users", method: "GET" } as Route<...>
}
```

## Config/Flags

No configuration options. Breaking change affects all generated client code.

## Breaking/Migration

**Breaking:** Yes - All import statements must be updated

**Migration steps:**
1. Change `import * as api` to `import api`
2. For namespaced routes, import and merge: `import api, { admin } from './api'`
3. Update client creation: `defineClient({ ...api, admin })`

## Tags

`breaking-change` `client` `generator` `typescript` `enums` `imports`

## Evidence

- **Enum compatibility**: Resolves type inference issues with enum parameters
- **Import consistency**: Follows standard JavaScript/TypeScript export patterns
- **Tree shaking**: Better bundler optimization for unused namespaces
- **IDE support**: Improved autocomplete and IntelliSense for route objects