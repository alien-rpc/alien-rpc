# Support Namespaces

**Commit:** f449319 | **Author:** Alec Larson | **Date:** 2025-02-12

## Summary

Adds support for organizing routes using TypeScript namespaces. Routes declared within `export namespace` blocks are automatically grouped in the generated client for better API organization and cleaner code structure.

## User-Visible Changes

- **Namespace organization**: Routes can be grouped using `export namespace` blocks
- **Nested client methods**: Generated client creates namespace-aware method access
- **Mixed structures**: Support for both namespaced and top-level routes
- **Nested namespaces**: Support for deeply nested namespace structures
- **Type safety**: Full TypeScript support with proper type inference
- **No breaking changes**: Existing flat routes continue to work unchanged

## Examples

### Server-Side Organization
```ts
// Before: Flat structure
export const getBilling = route.get('/billing', handler)
export const getProfile = route.get('/profile', handler)

// After: Namespace organization
export namespace account {
  export const getBilling = route.get('/billing', handler)
  export const getProfile = route.get('/profile', handler)
}

export namespace admin {
  export const getUsers = route.get('/admin/users', handler)
}
```

### Client Usage
```ts
// Before: Flat client methods
const billing = await client.getBilling()
const users = await client.getUsers()

// After: Namespaced client methods
const billing = await client.account.getBilling()
const users = await client.admin.getUsers()
```

### Advanced Usage
```ts
// Mixed namespace and top-level routes
export const healthCheck = route.get('/health', handler)

export namespace v1 {
  export const getUser = route.get('/v1/users/:id', handler)
}

// Nested namespaces
export namespace api {
  export namespace v1 {
    export const getUser = route.get('/api/v1/users/:id', handler)
  }
}

// Client usage
const health = await client.healthCheck()
const userV1 = await client.v1.getUser('123')
const userV2 = await client.api.v1.getUser('456')
```

### Implementation Details
- Automatic namespace detection in route analysis
- Nested client method generation
- Full type inference for namespaced routes
- Support for unlimited nesting depth

## Config/Flags
- No configuration required - automatically detected

## Breaking/Migration
- **Breaking**: None
- **Migration**: Gradual adoption - existing routes work unchanged

## Tags
`organization` `namespaces` `client-generation` `type-safety` `developer-experience`

## Evidence
- Files: `packages/client/src/client.ts`, `packages/generator/src/generator.ts`, `packages/generator/src/project/analyze-file.ts`
- Benefits: Better organization, improved autocomplete, reduced naming conflicts
- Use cases: API versioning, feature grouping, large-scale API organization