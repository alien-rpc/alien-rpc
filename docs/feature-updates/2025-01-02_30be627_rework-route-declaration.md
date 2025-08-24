# Route Declaration Rework

**Commit:** `30be627` (2025-01-02)
**Feature:** `feat!: rework \`route\` declaration` (Breaking Change)

## Overview

This breaking change reworks how routes are declared to improve TypeScript type inference. The new syntax separates the path declaration from the HTTP method, resolving TypeScript's difficulty with type inference when both the route path and handler were declared in the same function signature.

## Breaking Changes

### Old Syntax (Before)

```typescript
import { route } from '@alien-rpc/service'

// Old way: method first, then path and handler
export const getUser = route.get('/users/:id', async (id: string) => {
  return { id, name: 'John Doe' }
})

export const createPost = route.post(
  '/posts',
  async (data: { title: string }) => {
    return { id: 1, ...data }
  }
)

export const updateUser = route.put(
  '/users/:id',
  async (id: string, data: { name: string }) => {
    return { id, ...data }
  }
)
```

### New Syntax (After)

```typescript
import { route } from '@alien-rpc/service'

// New way: path first, then method and handler
export const getUser = route('/users/:id').get(async (id: string) => {
  return { id, name: 'John Doe' }
})

export const createPost = route('/posts').post(
  async (data: { title: string }) => {
    return { id: 1, ...data }
  }
)

export const updateUser = route('/users/:id').put(
  async (id: string, data: { name: string }) => {
    return { id, ...data }
  }
)
```

## Technical Implementation

### Route Factory Architecture

The new implementation uses a **builder pattern** with a `RouteFactory`:

```typescript
export type RouteFactory<T extends MiddlewareChain> = {
  // Path declaration - returns a RouteBuilder
  <TPath extends string>(path: TPath): RouteBuilder<TPath, T>

  // Path with inline middleware
  <TPath extends string, TMiddleware extends ExtractMiddleware<T>>(
    path: TPath,
    middleware: TMiddleware
  ): RouteBuilder<TPath, ApplyMiddleware<T, TMiddleware>>

  // WebSocket routes
  ws: <
    TArgs extends [...any[], ws.RequestContext<T>],
    const TResult extends ws.RouteResult,
  >(
    handler: (...args: TArgs) => TResult
  ) => ws.RouteDefinition

  // Middleware composition
  use: <TMiddleware extends ExtractMiddleware<T>>(
    middleware: TMiddleware
  ) => RouteFactory<ApplyMiddleware<T, TMiddleware>>
}
```

### Route Builder Types

The `RouteBuilder` provides HTTP method functions:

```typescript
export type RouteBuilder<
  TPath extends string,
  TMiddleware extends MiddlewareChain,
> = {
  [TMethod in
    | RouteMethod
    | Lowercase<RouteMethod>]: TPath extends MultiParamRoutePath
    ? MultiParamRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
    : TPath extends SingleParamRoutePath
      ? SingleParamRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
      : FixedRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
}
```

### Path-Aware Type Resolution

The new system provides **better type inference** based on path patterns:

1. **Fixed paths** (no parameters): `'/users'`
2. **Single parameter paths**: `'/users/:id'`
3. **Multi-parameter paths**: `'/groups/:groupId/users/:userId'`

Each path type gets specialized handler signatures for optimal TypeScript support.

## Migration Guide

### Step 1: Update Import (No Change)

```typescript
// This remains the same
import { route } from '@alien-rpc/service'
```

### Step 2: Restructure Route Declarations

#### Simple Routes

```typescript
// Before
export const getUsers = route.get('/users', async () => {
  return [{ id: 1, name: 'John' }]
})

// After
export const getUsers = route('/users').get(async () => {
  return [{ id: 1, name: 'John' }]
})
```

#### Routes with Path Parameters

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

#### Routes with Request Bodies

```typescript
// Before
export const createUser = route.post(
  '/users',
  async (data: { name: string; email: string }) => {
    return { id: 1, ...data }
  }
)

// After
export const createUser = route('/users').post(
  async (data: { name: string; email: string }) => {
    return { id: 1, ...data }
  }
)
```

#### Multiple Path Parameters

```typescript
// Before
export const getUserInGroup = route.get(
  '/groups/:groupId/users/:userId',
  async ([groupId, userId]: [string, string]) => {
    return { groupId, userId, name: 'John' }
  }
)

// After
export const getUserInGroup = route('/groups/:groupId/users/:userId').get(
  async ([groupId, userId]: [string, string]) => {
    return { groupId, userId, name: 'John' }
  }
)
```

### Step 3: Update Method Names (Optional)

Both uppercase and lowercase method names are supported:

```typescript
// Both of these work identically
export const getUser1 = route('/users/:id').GET(async (id: string) => {
  /* ... */
})
export const getUser2 = route('/users/:id').get(async (id: string) => {
  /* ... */
})
```

## Enhanced Features

### 1. Improved Middleware Support

```typescript
// Create reusable middleware-enhanced route factory
const authRoute = route.use(authMiddleware)

// Use with different paths
export const getProfile = authRoute('/profile').get(async ctx => {
  return { user: ctx.user }
})

export const updateProfile = authRoute('/profile').put(async (data, ctx) => {
  return { user: ctx.user, ...data }
})
```

### 2. Inline Middleware

```typescript
// Apply middleware to specific routes
export const adminRoute = route('/admin/users', adminMiddleware).get(
  async ctx => {
    return ctx.adminData
  }
)
```

### 3. Middleware Composition

```typescript
// Chain multiple middlewares
const secureRoute = route
  .use(authMiddleware)
  .use(rateLimitMiddleware)
  .use(loggingMiddleware)

export const sensitiveData = secureRoute('/sensitive').get(async ctx => {
  return { data: 'classified' }
})
```

## Benefits

### 1. **Better TypeScript Inference**

- Resolves type inference issues with the previous syntax
- More accurate parameter and return type detection
- Better IDE support and autocomplete

### 2. **Cleaner Syntax**

- Path is declared first, making route structure more obvious
- Method selection feels more natural after path declaration
- Consistent with builder pattern conventions

### 3. **Enhanced Middleware Integration**

- Middleware can be applied at the factory level or per-route
- Better composition and reusability
- Type-safe middleware context propagation

### 4. **Flexible Method Naming**

- Supports both uppercase (`GET`, `POST`) and lowercase (`get`, `post`) methods
- Maintains backward compatibility in terms of functionality

## WebSocket Routes

WebSocket route declaration remains similar but uses the factory pattern:

```typescript
// WebSocket routes use the .ws method
export const chatHandler = route.ws(
  async (message: string, ctx: ws.RequestContext) => {
    return { echo: message }
  }
)
```

## Route Context and Arguments

Route handler arguments remain the same:

### Fixed Paths (No Parameters)

```typescript
export const getUsers = route('/users').get(async (data, ctx) => {
  // data: search parameters (GET) or request body (POST/PUT/PATCH)
  // ctx: request context
})
```

### Single Path Parameter

```typescript
export const getUser = route('/users/:id').get(async (id, data, ctx) => {
  // id: path parameter value
  // data: search parameters or request body
  // ctx: request context
})
```

### Multiple Path Parameters

```typescript
export const getUserInGroup = route('/groups/:groupId/users/:userId').get(
  async ([groupId, userId], data, ctx) => {
    // [groupId, userId]: array of path parameter values
    // data: search parameters or request body
    // ctx: request context
  }
)
```

## Automated Migration

For large codebases, consider creating a migration script:

```typescript
// Example regex-based replacement (use with caution)
// Find: route\.(\w+)\(([^,]+),\s*
// Replace: route($2).$1(

// Before: route.get('/users/:id', async (id) => {
// After:  route('/users/:id').get(async (id) => {
```

## Compatibility Notes

- **Breaking Change**: All existing route declarations must be updated
- **Runtime Behavior**: No changes to runtime behavior or performance
- **Client Generation**: No changes required for client-side code
- **Documentation**: Route documentation (JSDoc) works the same way

## Related Types

```typescript
// Core types remain largely unchanged
export interface RouteDefinition<
  TPath extends string = string,
  TArgs extends readonly unknown[] = readonly unknown[],
  TResult = unknown,
  TMethod extends RouteMethod = RouteMethod
> {
  method: TMethod
  path: TPath
  handler: (...args: TArgs) => TResult
  middleware?: MiddlewareChain
}

// New factory and builder types
export type RouteFactory<T extends MiddlewareChain>
export type RouteBuilder<TPath extends string, TMiddleware extends MiddlewareChain>
```

This rework significantly improves the developer experience while maintaining the same powerful routing capabilities that alien-rpc provides.

## Open Questions

### Critical

- What are the exact TypeScript type signatures for RouteFactory and RouteBuilder, and how do they ensure type safety?
- How does TypeScript infer parameter types from path patterns like `/users/:id` or `/groups/:groupId/users/:userId` in the new syntax?
- What happens to TypeScript inference when using middleware with the new route declaration syntax?
- Are there breaking changes to existing TypeScript type definitions that affect client code generation?

### High

- How do the new RouteBuilder types handle different path patterns (fixed, single parameter, multi-parameter)?
- What are the TypeScript constraints for middleware composition using the new `route.use()` chaining?
- How does the new syntax affect TypeScript inference for route handler return types?
- What TypeScript utilities are available for testing routes declared with the new syntax?

### Medium

- Are there TypeScript patterns recommended for creating reusable route factories with proper type inference?
- How should developers type custom middleware when using the new route declaration syntax?
- What TypeScript support is available for the automated migration from old to new syntax?
