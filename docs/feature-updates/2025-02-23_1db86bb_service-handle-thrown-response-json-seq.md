# Service Handle Thrown Response in JSON Sequence

**Commit:** 1db86bba66b6f8b6b70799bc2d9853eec7b0f8f7
**Author:** Alec Larson
**Date:** Sun Feb 23 16:15:18 2025 -0500
**Short SHA:** 1db86bb

## Summary

This commit enhances the JSON Text Sequence responder to properly handle thrown Response objects and improves error handling with better stack trace management. It introduces a TracedResponse class that captures stack traces for debugging purposes during development.

## User Impact

**Audience:** Developers using JSON streaming routes that may throw Response objects
**Breaking Change:** No - additive enhancement
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### TracedResponse Class

```ts
// In packages/service/src/response.ts
class TracedResponse extends Response {
  /**
   * Record a stack trace in case this response is thrown. The responder
   * will forward this trace to the client during development, so the
   * source of the response can be found.
   */
  stack =
    process.env.NODE_ENV !== 'production'
      ? getStackTrace(new Error(), 2)
      : undefined
}
```

### Enhanced Error Handling in JSON-Seq

```ts
// In packages/service/src/responders/json-seq.ts
try {
  // ... route execution
} catch (error: any) {
  if (error instanceof Response) {
    error = {
      message: error.status + ' ' + error.statusText,
      stack:
        process.env.NODE_ENV !== 'production' && 'stack' in error
          ? error.stack
          : undefined,
    }
  } else {
    console.error(error)
    error = {
      ...error,
      message: error.message || 'An unknown error occurred',
      stack:
        process.env.NODE_ENV !== 'production'
          ? getStackTrace(error)
          : undefined,
    }
  }
  done = true
  value = { $error: error }
}
```

### Response Class Updates

All HTTP error response classes now extend `TracedResponse` instead of `Response`:

- `JsonResponse`
- `UnauthorizedError`
- `ForbiddenError`
- `NotFoundError`
- `MethodNotAllowedError`
- `ConflictError`
- `UnprocessableContentError`
- `PreconditionRequiredError`
- `TooManyRequestsError`
- `UnavailableForLegalReasonsError`
- `TemporaryRedirect`
- `PermanentRedirect`

## Implementation Details

### Stack Trace Management

```ts
// New utility function in errorUtils.ts
export function getStackTrace(error: Error, skip = 0) {
  const stack = error.stack?.replace(/^.*(?<! *at\b.*)\n/gm, '')
  return stack && skip > 0 ? stack.split('\n').slice(skip).join('\n') : stack
}
```

### Response Object Handling

When a `Response` object is thrown in a JSON streaming route:

1. **Status extraction:** Creates error message from `status` and `statusText`
2. **Stack trace preservation:** Includes stack trace if available and in development
3. **Error formatting:** Converts to standard error object format
4. **Stream termination:** Properly terminates the JSON sequence

### Development vs Production Behavior

- **Development:** Full stack traces included in error responses
- **Production:** Stack traces omitted for security
- **Console logging:** Errors logged to console in all environments

## Usage Examples

### Throwing Response Objects

```ts
import { route } from '@alien-rpc/service'
import { NotFoundError } from '@alien-rpc/service/response'

export const streamData = route.get('/stream', async function* () {
  for (let i = 0; i < 10; i++) {
    if (i === 5) {
      // This will be properly handled by json-seq responder
      throw new NotFoundError()
    }
    yield { item: i }
  }
})
```

### Error Response Format

```json
// Development environment
{"$error":{"message":"404 Not Found","stack":"Error\n    at streamData (/path/to/route.ts:8:13)\n    at ..."}}

// Production environment  
{"$error":{"message":"404 Not Found"}}
```

### Custom Response with Stack Trace

```ts
export const customError = route.get('/custom-error', async function* () {
  yield { status: 'starting' }
  
  // Custom response with automatic stack trace capture
  throw new JsonResponse({ error: 'Custom error occurred' }, { status: 400 })
})
```

## Error Handling Improvements

### Before: Limited Response Support

```ts
// Previous behavior - Response objects not handled specially
catch (error: any) {
  done = true
  value = {
    $error: {
      ...error,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    },
  }
}
```

### After: Comprehensive Response Handling

```ts
// New behavior - Response objects handled with status extraction
catch (error: any) {
  if (error instanceof Response) {
    // Extract meaningful error info from Response
    error = {
      message: error.status + ' ' + error.statusText,
      stack: process.env.NODE_ENV !== 'production' && 'stack' in error
        ? error.stack : undefined,
    }
  } else {
    // Enhanced regular error handling
    console.error(error)
    error = {
      ...error,
      message: error.message || 'An unknown error occurred',
      stack: process.env.NODE_ENV !== 'production'
        ? getStackTrace(error) : undefined,
    }
  }
  done = true
  value = { $error: error }
}
```

## Security Considerations

- **Stack trace exposure:** Only included in development environments
- **Error message sanitization:** Response status messages are safe to expose
- **Console logging:** Errors logged server-side for debugging

## Performance Impact

- **Minimal overhead:** Stack trace capture only in development
- **Memory usage:** TracedResponse instances include stack property when needed
- **Error path optimization:** Response detection uses instanceof check

## Files Modified

- `packages/service/src/compileRoutes.ts` - Updated error handling to use getStackTrace
- `packages/service/src/errorUtils.ts` - Added getStackTrace utility function
- `packages/service/src/responders/json-seq.ts` - Enhanced Response object handling
- `packages/service/src/response.ts` - Added TracedResponse class and updated all response classes

## Related Features

- JSON Text Sequence streaming (RFC 7464)
- Error response classes
- Development debugging tools
- Stack trace utilities

## Open Questions

No unanswered questions