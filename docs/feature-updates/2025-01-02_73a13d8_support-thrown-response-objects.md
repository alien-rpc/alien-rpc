# Support Thrown Response Objects

**Commit:** 73a13d8388f6e762f608e93f35db0704bf0cb1aa  
**Author:** Alec Larson  
**Date:** Thu Jan 2 14:23:01 2025 -0500  
**Short SHA:** 73a13d8

## Summary

This is a **breaking change** that replaces the old `HttpError` class system with Response subclasses that can be thrown directly from route handlers. The new system provides better integration with web standards and more flexible error handling.

## User Impact

**Audience:** All users who throw errors in their route handlers  
**Breaking Change:** Yes - existing `HttpError` usage must be migrated  
**Migration Required:** Yes - update error throwing code

## Key Changes

### Removed
- `HttpError` abstract class and all its subclasses
- Old constructor signatures for error classes

### Added
- `JsonResponse` class for JSON responses with automatic Content-Type header
- `InternalServerError` class (extends JsonResponse)
- All HTTP error classes now extend `Response` instead of `HttpError`
- New constructor signatures for all error classes

## Migration Guide

### Before (Old HttpError System)
```ts
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
```

### After (New Response System)
```ts
import { BadRequestError, UnauthorizedError } from '@alien-rpc/service'

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

### Constructor Changes

**BadRequestError:**
- Old: `new BadRequestError(message: string, headers?: Headers)`
- New: `new BadRequestError(error: { message: string } & Record<string, unknown>, headers?: Headers)`

**InternalServerError:**
- Old: `new InternalServerErrorError(message: string, headers?: Headers)`
- New: `new InternalServerError(error: { message: string } & Record<string, unknown>, headers?: Headers)`

**Other Error Classes:**
- Old: `new UnauthorizedError(message?: string, headers?: Headers)`
- New: `new UnauthorizedError(headers?: Headers)`

## New Response Classes

### JsonResponse
Base class for JSON responses with automatic Content-Type header:
```ts
import { JsonResponse } from '@alien-rpc/service'

// Automatically sets Content-Type: application/json
throw new JsonResponse({ error: 'Custom error' }, { status: 422 })
```

### Available Error Classes
All error classes now extend `Response` and can be thrown directly:

- `BadRequestError` (400) - extends JsonResponse
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `ConflictError` (409)
- `GoneError` (410)
- `LengthRequiredError` (411)
- `PreconditionFailedError` (412)
- `RangeNotSatisfiableError` (416)
- `ExpectationFailedError` (417)
- `MisdirectedRequestError` (421)
- `UnprocessableContentError` (422)
- `PreconditionRequiredError` (428)
- `TooManyRequestsError` (429)
- `UnavailableForLegalReasonsError` (451)
- `InternalServerError` (500) - extends JsonResponse

### Redirect Classes
- `TemporaryRedirect` (307)
- `PermanentRedirect` (308)

## Configuration

No configuration changes required. The new system works with existing `compileRoutes` setup.

## Dependencies

Adds new dependency:
- `option-types: ^1.1.0`

## References

**Files Modified:**
- `packages/service/src/compileRoutes.ts` - Updated error handling
- `packages/service/src/error.ts` - Removed (deleted)
- `packages/service/src/response.ts` - Added (new Response classes)
- `packages/service/src/headers.ts` - Added
- `packages/service/src/index.ts` - Updated exports
- `packages/service/package.json` - Added option-types dependency

**Related Documentation:**
- [HTTP Errors Documentation](../packages/service/docs/http-errors.md)

## Open Questions

**High**
- Are there any edge cases where the old HttpError.isHttpError() method was used that need migration guidance?
- Do any existing middleware or error handling patterns need updates for the new Response-based system?

**Medium**
- Should there be a compatibility layer or migration helper for the breaking constructor changes?
- Are there performance implications of using Response objects vs the old HttpError classes?

**Low**
- Should the JsonResponse class support additional JSON serialization options beyond JSON.stringify()?