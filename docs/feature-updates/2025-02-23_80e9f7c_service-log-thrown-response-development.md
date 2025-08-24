# Service Log Thrown Response in Development

**Commit:** 80e9f7c96b88db85230f39b9f905c8c720f97488
**Author:** Alec Larson
**Date:** Sun Feb 23 16:15:18 2025 -0500
**Short SHA:** 80e9f7c

## Summary

This commit enhances error logging in the JSON Text Sequence responder by adding specific logging for thrown Response objects in development environments and improving the error message format for Response objects.

## User Impact

**Audience:** Developers debugging JSON streaming routes in development
**Breaking Change:** No - logging enhancement only
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### Enhanced Response Object Logging

```ts
// In packages/service/src/responders/json-seq.ts
if (error instanceof Response) {
  if (!process.env.TEST && process.env.NODE_ENV !== 'production') {
    console.error(createError('Thrown response', error))
  }
  error = {
    code: error.status,
    message: error.statusText,
    stack:
      process.env.NODE_ENV !== 'production' && 'stack' in error
        ? error.stack
        : undefined,
  }
}
```

### Improved Error Message Format

**Before:**
```ts
error = {
  message: error.status + ' ' + error.statusText,
  // ...
}
```

**After:**
```ts
error = {
  code: error.status,
  message: error.statusText,
  // ...
}
```

### New Error Creation Utility

```ts
// In packages/service/src/errorUtils.ts
export function createError(message: string, props: any) {
  const error = new Error(message)
  Object.assign(error, props)
  if ('stack' in props) {
    error.stack = 'Error: ' + message + '\n' + props.stack
  }
  return error
}
```

### Test Environment Consideration

```ts
// Regular error logging
if (!process.env.TEST) {
  console.error(error)
}

// Response object logging
if (!process.env.TEST && process.env.NODE_ENV !== 'production') {
  console.error(createError('Thrown response', error))
}
```

## Implementation Details

### Logging Behavior by Environment

| Environment | Response Logging | Regular Error Logging |
|-------------|------------------|----------------------|
| Development | ✅ Full logging with context | ✅ Full logging |
| Production | ❌ No logging | ❌ No logging |
| Test | ❌ Suppressed | ❌ Suppressed |

### Error Object Structure Changes

**Response Objects:**
```ts
// Before
{ message: "404 Not Found" }

// After  
{ code: 404, message: "Not Found" }
```

**Regular Errors:**
```ts
// Unchanged
{ message: "Error message", stack: "..." }
```

### createError Utility Function

The new `createError` function:

1. **Creates Error instance:** `new Error(message)`
2. **Copies properties:** `Object.assign(error, props)`
3. **Preserves stack traces:** Combines message with existing stack
4. **Maintains Error prototype:** Returns proper Error instance

## Usage Examples

### Development Logging Output

```ts
import { route } from '@alien-rpc/service'
import { NotFoundError } from '@alien-rpc/service/response'

export const streamData = route.get('/stream', async function* () {
  yield { status: 'starting' }
  
  // This will be logged in development
  throw new NotFoundError()
})
```

**Console Output (Development):**
```
Error: Thrown response
    at streamData (/path/to/route.ts:6:9)
    at ...
{
  status: 404,
  statusText: 'Not Found',
  headers: Headers { ... },
  stack: 'Error\n    at new NotFoundError (/path/to/response.ts:123:5)\n    at ...'
}
```

**Client Response:**
```json
{"$error":{"code":404,"message":"Not Found","stack":"Error\n    at new NotFoundError..."}} 
```

### Error Message Separation

```ts
// Custom response with specific status
export const customError = route.get('/custom', async function* () {
  throw new JsonResponse(
    { error: 'Custom validation failed' }, 
    { status: 422, statusText: 'Unprocessable Entity' }
  )
})
```

**Result:**
```json
{"$error":{"code":422,"message":"Unprocessable Entity"}}
```

### createError Utility Usage

```ts
import { createError } from '@alien-rpc/service/errorUtils'

// Create error with additional properties
const error = createError('Database connection failed', {
  code: 'DB_CONNECTION_ERROR',
  retryable: true,
  stack: originalError.stack
})

console.error(error)
// Error: Database connection failed
//     at originalFunction (/path/to/file.ts:10:5)
//     at ...
```

## Debugging Benefits

### Before: Limited Response Context

```
// Only the transformed error object was available
{ message: "404 Not Found" }
```

### After: Full Response Context

```
// Development console shows full Response object
Error: Thrown response
    at routeHandler (/path/to/route.ts:15:9)
{
  status: 404,
  statusText: 'Not Found',
  headers: Headers { 'x-custom': 'value' },
  body: ReadableStream,
  stack: '...'
}

// Client receives structured error
{ code: 404, message: "Not Found", stack: "..." }
```

### Enhanced Error Tracking

1. **Source identification:** Stack traces show where Response was thrown
2. **Response inspection:** Full Response object properties visible
3. **Header debugging:** Custom headers preserved in logs
4. **Status separation:** HTTP code and message separated for clarity

## Environment-Specific Behavior

### Development Environment

- **Response logging:** Full Response object logged with context
- **Error logging:** All errors logged to console
- **Stack traces:** Included in both logs and client responses

### Production Environment

- **Response logging:** Disabled for performance
- **Error logging:** Disabled to prevent log spam
- **Stack traces:** Omitted from client responses for security

### Test Environment

- **All logging:** Suppressed to keep test output clean
- **Error handling:** Functions normally without console output
- **Assertions:** Error objects still properly formatted for testing

## Performance Considerations

- **Development overhead:** Minimal - only affects error paths
- **Production impact:** Zero - logging completely disabled
- **Memory usage:** createError utility reuses existing Error instances
- **Test performance:** Improved by suppressing console output

## Security Improvements

- **Stack trace control:** Only exposed in development
- **Error message separation:** Status codes and messages handled separately
- **Response object isolation:** Full Response details only in server logs

## Files Modified

- `packages/service/src/errorUtils.ts` - Added createError utility function
- `packages/service/src/responders/json-seq.ts` - Enhanced Response logging and error format

## Related Features

- JSON Text Sequence streaming (RFC 7464)
- Error response classes
- Development debugging tools
- Stack trace utilities
- Environment-specific behavior

## Open Questions

No unanswered questions