# Custom Message Support for UnauthorizedError

**Commit:** `4a5330e39fc1cc2560dd24efd5b0f496f41a3938`
**Date:** December 19, 2024
**Type:** Feature Enhancement
**Status:** Superseded by Response Refactoring (commit 73a13d8)

## Summary

This commit added support for custom error messages in the `UnauthorizedError` class, allowing developers to provide more specific error messages when throwing 401 Unauthorized errors. However, this feature was later superseded when the entire error system was refactored to use Response objects instead of HttpError classes.

## Technical Changes

### Modified Files

- `packages/service/src/error.ts` (later deleted in commit 73a13d8)

### Changes Made

**Before:**

```typescript
export class UnauthorizedError extends HttpError {
  name = 'UnauthorizedError'
  status = 401
}
```

**After:**

```typescript
export class UnauthorizedError extends HttpError {
  name = 'UnauthorizedError'
  status = 401
  constructor(
    readonly message: string,
    headers?: HttpError.Headers
  ) {
    super(headers)
  }
}
```

## User-Visible Impact

### Enhanced Error Messages

Developers could provide custom error messages when throwing UnauthorizedError:

```typescript
// Before: Generic unauthorized error
throw new UnauthorizedError()

// After: Custom error message
throw new UnauthorizedError('Invalid API key provided')
throw new UnauthorizedError('Session expired', {
  'WWW-Authenticate': 'Bearer realm="api"',
})
```

### Improved Debugging

- More specific error messages helped with debugging authentication issues
- Custom messages could provide context about why authorization failed
- Better error reporting in logs and client responses

## Implementation Details

### Constructor Signature

```typescript
constructor(
  readonly message: string,
  headers?: HttpError.Headers
)
```

### Usage Patterns

```typescript
// API key validation
if (!isValidApiKey(apiKey)) {
  throw new UnauthorizedError('Invalid or expired API key')
}

// Session validation
if (!session || session.expired) {
  throw new UnauthorizedError('Session expired, please login again')
}

// Permission-based authorization
if (!hasPermission(user, resource)) {
  throw new UnauthorizedError('Insufficient permissions for this resource')
}
```

## Superseded by Response Refactoring

**Important Note:** This feature was later removed in commit `73a13d8` (January 2, 2025) when the entire error system was refactored. The `HttpError` classes, including `UnauthorizedError`, were replaced with `Response` subclasses.

### Current Implementation (Post-Refactoring)

```typescript
// Current UnauthorizedError (as of commit 73a13d8)
export class UnauthorizedError extends Response {
  constructor(headers?: Headers) {
    super(null, { status: 401, headers })
  }
}
```

The custom message functionality is no longer available in the current Response-based implementation.

## Related Files

- `packages/service/src/error.ts` (deleted in commit 73a13d8)
- `packages/service/src/response.ts` (current error implementation)
- `packages/service/docs/http-errors.md` (error documentation)

## Migration Notes

### For Historical Context

If you're reviewing code from December 19, 2024 to January 2, 2025, you may encounter:

```typescript
// This syntax was valid during this period
throw new UnauthorizedError('Custom message')
```

### Current Usage

As of commit 73a13d8, use the Response-based approach:

```typescript
// Current approach - no custom message support
throw new UnauthorizedError()

// For custom messages, consider using BadRequestError or other approaches
throw new BadRequestError({ message: 'Custom error message' })
```

## Testing Considerations

### During Feature Lifetime

- Test custom error messages were properly set
- Verify headers were still supported alongside messages
- Ensure backward compatibility with existing code

### Post-Refactoring

- Update tests to use new Response-based error classes
- Remove tests that relied on custom message functionality
- Verify error handling still works correctly with new implementation

## Development Impact

### Temporary Enhancement

This feature provided a brief period (December 19, 2024 - January 2, 2025) where developers could use more descriptive error messages for authorization failures.

### Architectural Evolution

This change represents part of the evolution toward the current Response-based error system, demonstrating the iterative improvement of the error handling architecture.

## Open Questions

No unanswered questions
