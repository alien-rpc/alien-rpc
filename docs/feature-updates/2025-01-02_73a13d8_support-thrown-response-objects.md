# Support Thrown Response Objects

**Commit:** `73a13d8` (2025-01-02)

## Summary

**Breaking change** that replaces the old `HttpError` class system with Response subclasses that can be thrown directly from route handlers, providing better integration with web standards.

## User-visible Changes

- Removed `HttpError` abstract class and all its subclasses
- Added `JsonResponse` class for JSON responses with automatic Content-Type header
- Added `InternalServerError` class (extends JsonResponse)
- All HTTP error classes now extend `Response` instead of `HttpError`
- Updated constructor signatures for error classes
- New dependency: `option-types: ^1.1.0`

## Examples

### Migration from HttpError to Response

```typescript
// Before (Old HttpError System)
import { BadRequestError, UnauthorizedError } from '@alien-rpc/service'

export const getUser = route.get('/users/:id', async (id) => {
  if (!id) {
    throw new BadRequestError('User ID is required')
  }
  
  if (!isAuthenticated()) {
    throw new UnauthorizedError()
  }
  
  return await getUserById(id)
})

// After (New Response System)
export const getUser = route.get('/users/:id', async (id) => {
  if (!id) {
    throw new BadRequestError({ message: 'User ID is required' })
  }
  
  if (!isAuthenticated()) {
    throw new UnauthorizedError()
  }
  
  return await getUserById(id)
})
```

### JsonResponse Usage

```typescript
import { JsonResponse } from '@alien-rpc/service'

// Automatically sets Content-Type: application/json
throw new JsonResponse({ error: 'Custom error' }, { status: 422 })
```

### Constructor Changes

```typescript
// BadRequestError
// Old: new BadRequestError(message: string, headers?: Headers)
// New: new BadRequestError(error: { message: string } & Record<string, unknown>, headers?: Headers)

// InternalServerError
// Old: new InternalServerError(message: string, headers?: Headers)
// New: new InternalServerError(error: { message: string } & Record<string, unknown>, headers?: Headers)

// Other Error Classes (e.g., UnauthorizedError)
// Old: new UnauthorizedError(message?: string, headers?: Headers)
// New: new UnauthorizedError(headers?: Headers)
```

## Config/Flags

No configuration changes required. Works with existing `compileRoutes` setup.

## Breaking/Migration

**Breaking change**: All `HttpError` usage must be migrated to new Response-based error classes with updated constructor signatures.

## Tags

- service
- breaking-change
- error-handling
- response-objects
- web-standards
- http-errors

## Evidence

- Removed `packages/service/src/error.ts` (deleted HttpError classes)
- Added `packages/service/src/response.ts` (new Response classes)
- Updated `packages/service/src/compileRoutes.ts` for new error handling
- Added `packages/service/src/headers.ts`
- Updated exports in `packages/service/src/index.ts`
- Added `option-types: ^1.1.0` dependency