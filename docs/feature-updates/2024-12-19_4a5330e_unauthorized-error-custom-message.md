# Custom Message Support for UnauthorizedError

**Commit:** `4a5330e` (2024-12-19)

## Summary

Added support for custom error messages in the `UnauthorizedError` class, allowing developers to provide more specific error messages when throwing 401 Unauthorized errors. **Note: This feature was later superseded when the entire error system was refactored to use Response objects instead of HttpError classes (commit 73a13d8).**

## User-visible Changes

- Custom error messages for UnauthorizedError instances
- Better debugging with specific authorization failure context
- Enhanced error reporting in logs and client responses
- Support for custom messages alongside existing headers functionality
- **Status: Superseded** - Feature removed in Response refactoring

## Examples

### Enhanced Error Messages (Historical)

```typescript
// Before: Generic unauthorized error
throw new UnauthorizedError()

// After: Custom error message (during feature lifetime)
throw new UnauthorizedError('Invalid API key provided')
throw new UnauthorizedError('Session expired', {
  'WWW-Authenticate': 'Bearer realm="api"',
})
```

### Usage Patterns (Historical)

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

### Constructor Changes (Historical)

```typescript
// Before:
export class UnauthorizedError extends HttpError {
  name = 'UnauthorizedError'
  status = 401
}

// After (temporary implementation):
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

// Current (post-refactoring):
export class UnauthorizedError extends Response {
  constructor(headers?: Headers) {
    super(null, { status: 401, headers })
  }
}
```

### Migration to Current Implementation

```typescript
// Historical syntax (no longer valid)
throw new UnauthorizedError('Custom message')

// Current approach - no custom message support
throw new UnauthorizedError()

// For custom messages, use other Response classes
throw new BadRequestError({ message: 'Custom error message' })
```

## Config/Flags

No configuration required. Feature was automatic during its brief lifetime.

## Breaking/Migration

**Breaking change introduced later:** Custom message functionality removed in commit 73a13d8 Response refactoring. Code using custom messages needs migration to current Response-based approach.

## Tags

- error-handling
- unauthorized
- http-errors
- superseded
- historical
- breaking-change-later

## Evidence

- Modified `packages/service/src/error.ts` (later deleted in commit 73a13d8)
- Related to `packages/service/src/response.ts` (current error implementation)
- Related to `packages/service/docs/http-errors.md` (error documentation)
