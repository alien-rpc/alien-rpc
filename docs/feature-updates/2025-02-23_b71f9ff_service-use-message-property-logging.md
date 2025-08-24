# Service Use Message Property When Logging Thrown JSON Response

**Commit:** b71f9ff3112c4569a76d0f7296debed8b745b9dc
**Author:** Alec Larson
**Date:** Sun Feb 23 16:15:18 2025 -0500
**Short SHA:** b71f9ff

## Summary

This commit refactors error logging for thrown Response objects by using the `message` property from JsonResponse bodies when available, providing more meaningful error messages in development logs.

## User Impact

**Audience:** Developers debugging JSON streaming routes in development
**Breaking Change:** No - logging improvement only
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### Refactored Error Creation Utility

**Before:**
```ts
// In errorUtils.ts
export function createError(message: string, props: any) {
  const error = new Error(message)
  Object.assign(error, props)
  if ('stack' in props) {
    error.stack = 'Error: ' + message + '\n' + props.stack
  }
  return error
}

// Usage
console.error(createError('Thrown response', error))
```

**After:**
```ts
// In errorUtils.ts
export function getErrorFromResponse(response: Response) {
  const { message = 'Thrown response', ...props } =
    response instanceof JsonResponse ? response.decodedBody : {}
  const error = new Error(message)
  Object.assign(error, props)
  if ('stack' in response) {
    error.stack = 'Error: ' + message + '\n' + response.stack
  }
  return error
}

// Usage
console.error(getErrorFromResponse(error))
```

### Enhanced Message Extraction

```ts
// Extracts custom message from JsonResponse body
const { message = 'Thrown response', ...props } =
  response instanceof JsonResponse ? response.decodedBody : {}
```

### Updated JSON-Seq Logging

```ts
// In packages/service/src/responders/json-seq.ts
if (error instanceof Response) {
  if (!process.env.TEST && process.env.NODE_ENV !== 'production') {
    console.error(getErrorFromResponse(error))
  }
  // ... rest of error handling
}
```

## Implementation Details

### Message Priority Logic

1. **JsonResponse with message:** Uses `decodedBody.message`
2. **JsonResponse without message:** Falls back to `'Thrown response'`
3. **Other Response types:** Uses `'Thrown response'` default
4. **Property preservation:** All other properties copied to Error object

### Stack Trace Handling

```ts
// Stack trace comes from Response object, not props
if ('stack' in response) {
  error.stack = 'Error: ' + message + '\n' + response.stack
}
```

### Function Naming Improvement

- **Old:** `createError(message, props)` - generic error creation
- **New:** `getErrorFromResponse(response)` - specific to Response objects
- **Purpose clarity:** Function name clearly indicates its specific use case

## Usage Examples

### Custom JsonResponse with Message

```ts
import { route } from '@alien-rpc/service'
import { JsonResponse } from '@alien-rpc/service/response'

export const streamData = route.get('/stream', async function* () {
  yield { status: 'starting' }
  
  // Custom error with meaningful message
  throw new JsonResponse({
    message: 'User authentication failed',
    code: 'AUTH_ERROR',
    userId: 12345
  }, { status: 401 })
})
```

**Development Console Output:**
```
Error: User authentication failed
    at streamData (/path/to/route.ts:6:9)
    at ...
{
  code: 'AUTH_ERROR',
  userId: 12345,
  status: 401,
  statusText: 'Unauthorized',
  headers: Headers { ... }
}
```

### JsonResponse without Custom Message

```ts
export const streamData = route.get('/stream', async function* () {
  yield { status: 'starting' }
  
  // No custom message in body
  throw new JsonResponse({
    code: 'VALIDATION_ERROR',
    field: 'email'
  }, { status: 400 })
})
```

**Development Console Output:**
```
Error: Thrown response
    at streamData (/path/to/route.ts:6:9)
    at ...
{
  code: 'VALIDATION_ERROR',
  field: 'email',
  status: 400,
  statusText: 'Bad Request',
  headers: Headers { ... }
}
```

### Standard Response Object

```ts
import { NotFoundError } from '@alien-rpc/service/response'

export const streamData = route.get('/stream', async function* () {
  yield { status: 'starting' }
  
  // Standard response class (no decodedBody)
  throw new NotFoundError()
})
```

**Development Console Output:**
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

## Error Message Improvements

### Before: Generic Messages

```
// All thrown responses logged with same message
Error: Thrown response
    at routeHandler (/path/to/route.ts:15:9)
```

### After: Contextual Messages

```
// Custom messages from JsonResponse bodies
Error: User authentication failed
    at routeHandler (/path/to/route.ts:15:9)

Error: Invalid request parameters
    at routeHandler (/path/to/route.ts:22:9)

Error: Database connection timeout
    at routeHandler (/path/to/route.ts:30:9)
```

## JsonResponse Body Structure

### Recommended Pattern

```ts
// Structure for meaningful error logging
throw new JsonResponse({
  message: 'Human-readable error description',  // Used in logs
  code: 'ERROR_CODE',                         // Application error code
  details: 'Additional context information',   // Extra debugging info
  timestamp: new Date().toISOString(),        // Error occurrence time
  requestId: 'req-12345'                      // Request correlation ID
}, { status: 400 })
```

### Message Property Benefits

1. **Log clarity:** Descriptive error messages in development logs
2. **Debugging efficiency:** Quickly identify error types from logs
3. **Context preservation:** Custom messages provide business context
4. **Consistency:** Standardized approach to error message extraction

## Development Workflow Improvements

### Error Identification

```ts
// Multiple different errors in same route
export const processData = route.get('/process', async function* () {
  if (!user.authenticated) {
    throw new JsonResponse({ 
      message: 'Authentication required' 
    }, { status: 401 })
  }
  
  if (!user.hasPermission('read')) {
    throw new JsonResponse({ 
      message: 'Insufficient permissions' 
    }, { status: 403 })
  }
  
  if (!data.isValid) {
    throw new JsonResponse({ 
      message: 'Invalid data format' 
    }, { status: 400 })
  }
  
  yield { result: processedData }
})
```

**Log Output Differentiation:**
```
Error: Authentication required
Error: Insufficient permissions  
Error: Invalid data format
```

### Stack Trace Preservation

- **Response stack:** Original Response creation stack trace preserved
- **Error stack:** Combined with custom message for full context
- **Source mapping:** Points to exact location where Response was thrown

## Function Signature Changes

### Removed Function

```ts
// No longer available
export function createError(message: string, props: any)
```

### New Function

```ts
// Specialized for Response objects
export function getErrorFromResponse(response: Response): Error
```

### Migration Guide

If you were using `createError` directly (unlikely as it was internal):

```ts
// Before
const error = createError('Custom message', responseObject)

// After  
const error = getErrorFromResponse(responseObject)
// Note: message now comes from response.decodedBody.message
```

## Performance Considerations

- **Development only:** Function only called in development environments
- **Error path optimization:** Minimal overhead on error handling paths
- **Memory efficiency:** Reuses existing Error objects and properties
- **Property copying:** Efficient object spread and assignment

## Security Implications

- **Message exposure:** Custom messages only in development logs
- **Property isolation:** Response properties copied to Error for logging
- **Stack trace handling:** Preserves original Response stack traces
- **Production safety:** No changes to production error handling

## Files Modified

- `packages/service/src/errorUtils.ts` - Replaced `createError` with `getErrorFromResponse`
- `packages/service/src/responders/json-seq.ts` - Updated to use new error function

## Related Features

- JSON Text Sequence streaming (RFC 7464)
- JsonResponse error handling
- Development debugging tools
- Error logging utilities
- Response object stack traces

## Open Questions

No unanswered questions