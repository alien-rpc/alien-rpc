# Route Declaration Rework

**Commit:** `30be627` (2025-01-02)

## Summary

Breaking change that reworks route declarations to improve TypeScript type inference by separating path declaration from HTTP method using a builder pattern.

## User-visible Changes

- Route syntax changes from `route.get('/path', handler)` to `route('/path').get(handler)`
- Better TypeScript type inference for path parameters and handler arguments
- Enhanced middleware composition with `route.use(middleware)`
- Support for both uppercase and lowercase HTTP method names

## Examples

### Before/After Route Declaration

```typescript
// Before
export const getUser = route.get('/users/:id', async (id: string) => {
  return { id, name: 'John Doe' }
})

// After
export const getUser = route('/users/:id').get(async (id: string) => {
  return { id, name: 'John Doe' }
})
```

### Middleware Composition

```typescript
// Factory with middleware
const authRoute = route.use(authMiddleware)
export const getProfile = authRoute('/profile').get(async ctx => {
  return { user: ctx.user }
})

// Inline middleware
export const adminRoute = route('/admin/users', adminMiddleware).get(
  async ctx => ctx.adminData
)
```

## Config/Flags

No configuration changes required. This is a syntax-only breaking change.

## Breaking/Migration

**Breaking Change**: All route declarations must be updated from `route.method(path, handler)` to `route(path).method(handler)`.

**Migration Steps**:
1. Change `route.get('/path', handler)` to `route('/path').get(handler)`
2. Update all HTTP methods (GET, POST, PUT, DELETE, etc.)
3. Middleware usage changes to `route.use(middleware)` for composition

## Tags

- breaking-change
- typescript
- routes
- middleware
- type-inference

## Evidence

- Modified route declaration syntax in service layer
- Updated TypeScript type definitions for RouteFactory and RouteBuilder
- Enhanced middleware composition system
- Improved path parameter type inference
