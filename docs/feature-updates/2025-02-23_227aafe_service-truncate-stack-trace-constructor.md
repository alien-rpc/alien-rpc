# Service Truncate Stack Trace Using Error Constructor Function

**Commit:** 227aafe  
**Date:** February 23, 2025  
**Type:** Enhancement  
**Breaking Change:** ❌ No

## Summary

Improves stack trace truncation by using the error's constructor function to intelligently find the appropriate truncation point, providing cleaner and more relevant stack traces in error responses. Replaces fixed skip count with dynamic constructor-based detection.

## User-Visible Changes

- **Cleaner stack traces**: Automatically excludes error constructor lines from stack traces
- **Dynamic truncation**: Uses constructor function instead of fixed skip count
- **Better debugging**: Stack traces start from actual application code, not error construction
- **Consistent behavior**: Same truncation logic across all error classes
- **Automatic benefits**: Existing code gets improved stack traces without changes
- **Development-only**: Stack trace processing only occurs in non-production environments

## Examples

### Enhanced Stack Trace Output
```ts
// Before (fixed skip count)
Error
    at new NotFoundError (/path/to/response.ts:123:5)  // Included
    at getUserRoute (/path/to/route.ts:6:11)           // Included
    at processRequest (/path/to/server.ts:45:12)

// After (constructor-based)
Error
    at getUserRoute (/path/to/route.ts:6:11)           // Starts here
    at processRequest (/path/to/server.ts:45:12)
```

### Custom Error Classes
```ts
class CustomValidationError extends JsonResponse {
  constructor(field: string, value: any) {
    super({ message: `Invalid ${field}`, field, value }, { status: 422 })
  }
}

// Stack trace excludes CustomValidationError constructor
throw new CustomValidationError('age', body.age)
```

### Function Signature Change
```ts
// Before: Fixed skip count
export function getStackTrace(error: Error, skip = 0)

// After: Constructor-based truncation
export function getStackTrace(error: Error, constructor?: Function)
```

## Config/Flags

- Constructor-based truncation automatically applied to all `TracedResponse` subclasses
- Fallback to full stack trace if constructor not found in stack
- Development-only feature (disabled in production)
- Backward compatible with existing `skip` parameter

## Breaking/Migration

**Breaking:** No - Enhanced stack traces with automatic benefits

**Migration:** None required - existing code gets improved stack traces automatically

## Tags

`stack-trace` `error-handling` `debugging` `service` `response` `development`

## Evidence

- **Function signature**: Changed from `getStackTrace(error, skip)` to `getStackTrace(error, constructor?)`
- **Truncation logic**: Searches for `'new ' + constructor.name` in stack lines
- **Fallback behavior**: Returns full stack if constructor not found
- **Performance**: Development-only with minimal string processing overhead
- **Files modified**: `packages/service/src/errorUtils.ts`, `packages/service/src/response.ts`