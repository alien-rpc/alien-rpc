# Migrate to alien-middleware

**Commit:** fce6890  
**Date:** May 4, 2025  
**Type:** Breaking Change  
**Breaking Change:** ⚠️ Yes - Middleware API and dependency changes

## Summary

Breaking change that migrates alien-rpc from `@hattip/compose` to `alien-middleware`, providing safer and more type-safe middleware API. Enhances middleware composition, improves type inference, and reduces external dependencies while maintaining backward compatibility for most use cases.

## User-Visible Changes

- **Import changes**: `@hattip/compose` → `alien-middleware`
- **Type changes**: `RequestContext` → `MiddlewareContext`
- **Composition API**: New `chain()` and `.use()` methods
- **Route definitions**: Enhanced middleware typing with `MiddlewareChain`
- **Dependency removal**: Eliminates `@hattip/compose` dependency

## Examples

### Import and Type Changes
```ts
// Before
import { compose, type RequestContext } from '@hattip/compose'
const middleware = (ctx: RequestContext) => ctx.next()

// After
import { chain, type MiddlewareContext } from 'alien-middleware'
const middleware = (ctx: MiddlewareContext) => ctx.next()
```

### Middleware Composition
```ts
// Before
const handler = compose(loggingMiddleware, authMiddleware, routeHandler)

// After
const middlewareChain = chain(loggingMiddleware).use(authMiddleware)
const authenticatedRoute = route.use(middlewareChain)
```

### Enhanced Type Safety
```ts
const authMiddleware = (ctx: MiddlewareContext) => {
  ctx.user = { id: '123', name: 'John' }
  return ctx.next()
}

const authenticatedRoute = route.use(authMiddleware)
export const getProfile = authenticatedRoute('/profile').get(
  async (ctx: RouteContext<typeof authenticatedRoute>) => {
    // ctx.user is properly typed and guaranteed to exist
    return { user: ctx.user }
  }
)
```

## Config/Flags

No configuration options. Breaking change affects all middleware usage.

## Breaking/Migration

**Breaking:** Yes - All middleware imports and implementations must be updated

**Migration steps:**
1. Remove `@hattip/compose` dependency
2. Update imports: `@hattip/compose` → `alien-middleware`
3. Change types: `RequestContext` → `MiddlewareContext`
4. Update composition: `compose()` → `chain().use()`
5. Update route definitions to use new middleware types

## Tags

`breaking-change` `middleware` `service` `typescript` `dependencies` `hattip`

## Evidence

- **Type safety**: Better TypeScript inference for middleware context
- **Safer API**: More predictable middleware execution order
- **Reduced dependencies**: Eliminates `@hattip/compose` dependency
- **Enhanced DX**: Clearer middleware composition patterns and better error messages