# Add `buildRouteURL` and `getRouteFromFunction` Functions

**Commit:** `4f3d4c2`  
**Date:** February 25, 2025  
**Type:** Breaking Change

## Overview

This commit introduces two new utility functions `buildRouteURL` and `getRouteFromFunction` while removing the `Client#paths` property, representing a significant breaking change in how route URLs are constructed and route metadata is accessed.

## Breaking Changes

### Removed Features
- **`Client#paths` property**: Previously provided endpoint URI strings for all routes
- **`arePropertiesOptional` function**: Internal utility function removed from generator

### Type Changes
- Modified public types in client package
- Updated route generation logic in generator package

## New Features

### `buildRouteURL` Function

Constructs URLs for routes with proper parameter substitution.

```ts
import { buildRouteURL } from 'alien-rpc/client'

// For routes with parameters
const url = buildRouteURL(api.getUser, { id: '123' })
// Returns: '/users/123'

// For routes without parameters
const url = buildRouteURL(api.getUsers)
// Returns: '/users'
```

**Function Overloads:**
- `buildRouteURL(route: Route.withNoParams): string`
- `buildRouteURL<T>(route: T, params: Route.inferParams<T>): string`

### `getRouteFromFunction` Function

Extracts route metadata from a route function.

```ts
import { getRouteFromFunction } from 'alien-rpc/client'

const route = getRouteFromFunction(api.getUser)
// Returns the Route object with method, path, format, etc.
```

### New Route Helper Types

Introduced several utility types for better type safety:

#### `Route.withNoParams`
Shorthand for routes with no path or search parameters:
```ts
type SimpleRoute = Route.withNoParams
```

#### `Route.withOptionalParams`
Shorthand for routes with only optional parameters:
```ts
type FlexibleRoute = Route.withOptionalParams
```

#### `Route.inferParams<T>`
Extracts parameter types from a route (excludes request body):
```ts
type UserParams = Route.inferParams<typeof api.getUser>
// Infers: { id: string }
```

#### `Route.inferResult<T>`
Extracts the result type from a route:
```ts
type UserResult = Route.inferResult<typeof api.getUser>
// Infers the return type of the route handler
```

## Migration Guide

### Replacing `client.paths`

**Before:**
```ts
const client = defineClient({ ... })
const userUrl = client.paths.getUser({ id: '123' })
```

**After:**
```ts
import { buildRouteURL } from 'alien-rpc/client'

const client = defineClient({ ... })
const userUrl = buildRouteURL(client.getUser, { id: '123' })
```

### Accessing Route Metadata

**Before:**
```ts
// No direct equivalent - had to access internal properties
```

**After:**
```ts
import { getRouteFromFunction } from 'alien-rpc/client'

const route = getRouteFromFunction(client.getUser)
console.log(route.method) // 'GET'
console.log(route.path)   // '/users/:id'
```

## Implementation Details

### Internal Symbols
Both functions use internal symbols for route metadata access:
- `kRouteProperty`: Links route functions to their Route objects
- `kClientProperty`: Links route functions to their Client instances

### Type Safety Improvements
The new helper types provide better compile-time guarantees:
- `Route.inferParams<T>` ensures parameter types match route expectations
- `Route.withNoParams` and `Route.withOptionalParams` provide clear parameter contracts
- `Route.inferResult<T>` enables better result type inference

## Benefits

1. **More Explicit API**: Functions are more discoverable than object properties
2. **Better Type Safety**: Helper types provide stronger compile-time guarantees
3. **Consistent Pattern**: Aligns with functional programming patterns
4. **Metadata Access**: `getRouteFromFunction` provides access to route internals
5. **Parameter Validation**: `buildRouteURL` ensures proper parameter handling

## Related Files

- `packages/client/src/client.ts`: Function implementations
- `packages/client/src/types.ts`: Type definitions and helper types
- `packages/client/src/protocols/http.ts`: Route function creation
- `packages/generator/src/project/analyze-route.ts`: Route analysis updates
- `packages/generator/src/project/utils.ts`: Generator utility changes

This change represents a significant improvement in the alien-rpc client API, providing more explicit and type-safe methods for URL construction and route introspection while maintaining backward compatibility through clear migration paths.