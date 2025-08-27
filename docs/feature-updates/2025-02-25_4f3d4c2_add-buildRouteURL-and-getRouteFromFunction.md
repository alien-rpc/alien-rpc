# Add `buildRouteURL` and `getRouteFromFunction` Functions

**Commit:** 4f3d4c2  
**Date:** February 25, 2025  
**Type:** Breaking Change  
**Breaking Change:** ⚠️ Yes

## Summary

Introduces two new utility functions `buildRouteURL` and `getRouteFromFunction` while removing the `Client#paths` property, representing a significant breaking change in how route URLs are constructed and route metadata is accessed.

## User-Visible Changes

- **New functions**: `buildRouteURL()` for URL construction, `getRouteFromFunction()` for route metadata
- **Removed**: `Client#paths` property no longer available
- **New helper types**: `Route.withNoParams`, `Route.withOptionalParams`, `Route.inferParams<T>`, `Route.inferResult<T>`
- **Better type safety**: Stronger compile-time guarantees for parameter handling
- **Migration required**: Existing code using `client.paths` must be updated

## Examples

```ts
// Before: Using client.paths
const client = defineClient({ ... })
const userUrl = client.paths.getUser({ id: '123' })

// After: Using buildRouteURL
import { buildRouteURL, getRouteFromFunction } from 'alien-rpc/client'
const userUrl = buildRouteURL(client.getUser, { id: '123' })

// Route metadata access
const route = getRouteFromFunction(client.getUser)
console.log(route.method) // 'GET'
console.log(route.path)   // '/users/:id'
```

## Config/Flags

- New helper types: `Route.withNoParams`, `Route.withOptionalParams`, `Route.inferParams<T>`, `Route.inferResult<T>`
- Internal symbols: `kRouteProperty`, `kClientProperty` for metadata access

## Breaking/Migration

- **Breaking**: Removed `Client#paths` property and `arePropertiesOptional` function
- **Migration**: Replace `client.paths.routeName(params)` with `buildRouteURL(client.routeName, params)`

## Tags

`breaking-change`, `url-construction`, `route-metadata`, `type-safety`, `client-api`

## Evidence

- **Files modified**: `client.ts`, `types.ts`, `protocols/http.ts`, generator utilities
- **New features**: `buildRouteURL()` and `getRouteFromFunction()` functions
- **Developer experience**: More explicit API with better type safety and discoverability