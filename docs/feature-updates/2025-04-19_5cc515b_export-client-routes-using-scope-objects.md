# Export Client Routes Using Scope Objects

**Commit:** 5cc515b  
**Date:** April 19, 2025  
**Type:** Breaking Change  
**Breaking Change:** ⚠️ Yes - Changes client route import structure

## Overview

This breaking change modifies how client routes are exported in generated code, replacing TypeScript namespace exports with scope objects. The default scope uses `export default { ... }` declarations, while namespaced routes use `export const <name> = { ... }` declarations. This change resolves issues with enum types when calling `defineClient` and provides a more consistent import experience.

## Breaking Changes

### Client Route Export Structure

#### Before (Namespace Exports)
```typescript
// Generated client/api.ts
export const getUser: Route<...> = { ... } as any
export const createUser: Route<...> = { ... } as any

export namespace admin {
  export const getUsers: Route<...> = { ... } as any
  export const deleteUser: Route<...> = { ... } as any
}
```

#### After (Scope Objects)
```typescript
// Generated client/api.ts
export default {
  getUser: { ... } as Route<...>,
  createUser: { ... } as Route<...>
}

export const admin = {
  getUsers: { ... } as Route<...>,
  deleteUser: { ... } as Route<...>
}
```

### Import and Usage Changes

#### Before
```typescript
import { defineClient } from 'alien-rpc/client'
import * as api from './generated/api.ts'

const client = defineClient(api)

// Access routes directly
const user = await client.getUser({ id: '123' })
const users = await client.admin.getUsers()
```

#### After
```typescript
import { defineClient } from 'alien-rpc/client'
import api from './generated/api.ts'

const client = defineClient(api)

// Same usage - no changes to client method calls
const user = await client.getUser({ id: '123' })
```

#### Namespaced Routes
```typescript
// For namespaced routes, you need to merge them manually
import { defineClient } from 'alien-rpc/client'
import api, { admin } from './generated/api.ts'

// Option 1: Separate clients
const client = defineClient(api)
const adminClient = defineClient(admin)

const user = await client.getUser({ id: '123' })
const users = await adminClient.getUsers()

// Option 2: Merged client (all-encompassing)
const client = defineClient({ ...api, admin })

const user = await client.getUser({ id: '123' })
const users = await client.admin.getUsers()
```

## Implementation Details

### Generator Changes

The core change is in `packages/generator/src/generator.ts` in the `writeClientDefinitions` function:

```typescript
// Before: Individual exports with namespace blocks
scopeDefinitions.push(
  (description || '') +
    `export const ${methodName}: Route<...> = {...} as any`
)

// After: Object properties within scope declarations
scopeDefinitions.push(
  (description || '') +
    `${methodName}: {...} as Route<...>`
)
```

### Scope Declaration Logic
```typescript
Object.entries(clientDefinitions).map(
  ([scopeName, methodDefinitions]) => {
    const scopeDeclaration = scopeName
      ? `const ${scopeName} =`  // Named export for namespaces
      : `default`              // Default export for root scope

    return dedent`
      export ${scopeDeclaration} {
        ${methodDefinitions.join(',\n\n')}
      }
    `
  }
)
```

## Benefits

### Enum Type Compatibility
- **Resolved enum issues**: Eliminates problems with enum types when calling `defineClient`
- **Better type inference**: Improved TypeScript type checking for complex types
- **Consistent behavior**: Enums and other types work uniformly across all route definitions

### Cleaner Import Structure
- **Simplified imports**: Default export for main API, named exports for namespaces
- **Explicit dependencies**: Clear separation between default and namespaced routes
- **Better tree shaking**: Bundlers can more effectively eliminate unused namespaces

### Improved Developer Experience
- **Consistent patterns**: Follows standard JavaScript/TypeScript export conventions
- **IDE support**: Better autocomplete and IntelliSense for route objects
- **Debugging**: Easier to inspect route definitions in development tools

## Migration Guide

### Step 1: Update Imports

**Before:**
```typescript
import * as api from './generated/api.ts'
```

**After:**
```typescript
import api from './generated/api.ts'
```

### Step 2: Handle Namespaced Routes

If you have namespaced routes and want to maintain the same client interface:

**Before:**
```typescript
import * as api from './generated/api.ts'
const client = defineClient(api)

// All routes available directly
const user = await client.getUser({ id: '123' })
const users = await client.admin.getUsers()
```

**After:**
```typescript
import api, { admin } from './generated/api.ts'
const client = defineClient({ ...api, admin })

// Same usage pattern maintained
const user = await client.getUser({ id: '123' })
const users = await client.admin.getUsers()
```

### Step 3: Alternative Approaches

**Separate Clients (Recommended for large APIs):**
```typescript
import api, { admin, billing } from './generated/api.ts'

const publicClient = defineClient(api)
const adminClient = defineClient(admin)
const billingClient = defineClient(billing)

// Clear separation of concerns
const user = await publicClient.getUser({ id: '123' })
const users = await adminClient.getUsers()
const invoice = await billingClient.getInvoice({ id: 'inv_123' })
```

**Selective Merging:**
```typescript
import api, { admin } from './generated/api.ts'

// Only merge specific namespaces you need
const client = defineClient({ 
  ...api, 
  admin // Only include admin namespace
})
```

## Generated Code Examples

### Simple API (No Namespaces)

**Generated Output:**
```typescript
import type { Route } from "@alien-rpc/client";

export default {
  getUser: {
    path: "users/:id",
    method: "GET",
    arity: 2,
    format: "json"
  } as Route<(pathParams: { id: string }) => Promise<User>>,

  createUser: {
    path: "users",
    method: "POST",
    arity: 2,
    format: "json"
  } as Route<(body: CreateUserRequest) => Promise<User>>
};
```

### API with Namespaces

**Generated Output:**
```typescript
import type { Route } from "@alien-rpc/client";

export default {
  getHealth: {
    path: "health",
    method: "GET",
    arity: 1,
    format: "json"
  } as Route<() => Promise<{ status: string }>>
};

export const admin = {
  getUsers: {
    path: "admin/users",
    method: "GET",
    arity: 1,
    format: "json"
  } as Route<() => Promise<User[]>>,

  deleteUser: {
    path: "admin/users/:id",
    method: "DELETE",
    arity: 2,
    format: "json"
  } as Route<(pathParams: { id: string }) => Promise<void>>
};

export const billing = {
  getInvoices: {
    path: "billing/invoices",
    method: "GET",
    arity: 1,
    format: "json"
  } as Route<() => Promise<Invoice[]>>
};
```

## Compatibility

### TypeScript Compatibility
- **Minimum version**: No change - same TypeScript requirements
- **Type inference**: Improved type checking for complex scenarios
- **IDE support**: Better autocomplete and error reporting

### Runtime Compatibility
- **Client behavior**: No changes to runtime client method calls
- **Performance**: Identical runtime performance characteristics
- **Bundle size**: Potential improvements with better tree shaking

### Framework Integration
- **React**: No changes to hook usage or component integration
- **Vue**: No changes to composable usage
- **Node.js**: No changes to server-side client usage

## Edge Cases and Considerations

### Enum Types
This change specifically resolves issues with enum types:

```typescript
// Before: Could cause issues with enum inference
export const createShape: Route<...> = { ... } as any

// After: Clean enum type handling
export default {
  createShape: { ... } as Route<(body: { type: ShapeType }) => Promise<Shape>>
}
```

### Deep Namespace Nesting
```typescript
// Nested namespaces are flattened into separate exports
export const api = {
  // api.v1.* routes
};

export const apiV1 = {
  // Flattened from api.v1 namespace
};
```

### Mixed Route Types
```typescript
// HTTP and WebSocket routes work identically
export default {
  getUser: { ... } as Route<...>,
  subscribe: { ... } as ws.Route<...>
};
```

## Troubleshooting

### Common Migration Issues

**Issue: "Cannot find module" after upgrade**
```typescript
// ❌ Old import style
import * as api from './generated/api.ts'

// ✅ New import style
import api from './generated/api.ts'
```

**Issue: "Property 'admin' does not exist" for namespaced routes**
```typescript
// ❌ Missing namespace import
import api from './generated/api.ts'
const client = defineClient(api)
client.admin.getUsers() // Error!

// ✅ Import and merge namespace
import api, { admin } from './generated/api.ts'
const client = defineClient({ ...api, admin })
client.admin.getUsers() // Works!
```

**Issue: Type errors with enum parameters**
```typescript
// ✅ This change resolves enum type issues automatically
import api from './generated/api.ts'
const client = defineClient(api)

// Enum types now work correctly
const shape = await client.createShape({ type: ShapeType.Rectangle })
```

### Debugging Tips

1. **Check generated file structure**: Verify the export format matches expectations
2. **Inspect import statements**: Ensure you're using the correct import syntax
3. **Validate namespace merging**: Confirm all required namespaces are included
4. **Test enum usage**: Verify enum types work correctly with the new structure

## Related Changes

- **Enum Support**: This change works in conjunction with the enum support added in commit `e5b51b7`
- **Type Safety**: Improves upon the type safety enhancements from previous commits
- **Client Generation**: Part of the ongoing improvements to client code generation

## Future Considerations

### Potential Enhancements
- **Automatic namespace merging**: Future versions might provide utilities for easier namespace merging
- **Configuration options**: Possible configuration to control export style preferences
- **Migration tooling**: Potential codemod tools to automate migration

### Backward Compatibility
This is a breaking change with no backward compatibility. All projects must update their import statements when upgrading to this version.

The change provides significant benefits for type safety and developer experience, particularly when working with enums and complex type definitions, making the migration effort worthwhile for most projects.