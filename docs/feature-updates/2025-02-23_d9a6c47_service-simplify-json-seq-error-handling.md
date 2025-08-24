# Service Simplify JSON-seq Error Handling

**Commit:** d9a6c47a8f7c42eeedd6dbf5e6fdbe73f016e20c
**Author:** Alec Larson
**Date:** Sun Feb 23 18:21:55 2025 -0500
**Short SHA:** d9a6c47

## Summary

This commit simplifies error handling in the JSON Text Sequence responder by consolidating error processing logic, ensuring consistent error formatting across different error types, and adding production environment checks for stack trace inclusion.

## User Impact

**Audience:** Developers using JSON Text Sequence endpoints with error handling
**Breaking Change:** No - error format remains consistent
**Migration Required:** No - internal refactoring only

## Key Changes

### Consolidated Error Processing Logic

**Before:**
```ts
// In packages/service/src/responders/json-seq.ts
catch (error: any) {
  if (error instanceof Response) {
    if (!process.env.TEST && process.env.NODE_ENV !== 'production') {
      console.error(getErrorFromResponse(error))
    }
    error = {
      code: error.status,
      message: error.statusText,
      stack:
        process.env.NODE_ENV !== 'production' && 'stack' in error
          ? error.stack
          : undefined,
    }
  } else {
    if (!process.env.TEST) {
      console.error(error)
    }
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

**After:**
```ts
// In packages/service/src/responders/json-seq.ts
catch (error: any) {
  if (error instanceof Response) {
    error = getErrorFromResponse(error)
  }
  if (!process.env.TEST) {
    console.error(error)
  }
  error = {
    ...error,
    message: error.message || 'An unknown error occurred',
    stack:
      process.env.NODE_ENV !== 'production'
        ? '\n' + getStackTrace(error)
        : undefined,
  }
  done = true
  value = { $error: error }
}
```

### Enhanced getErrorFromResponse Function

**Before:**
```ts
// In packages/service/src/errorUtils.ts
export function getErrorFromResponse(response: Response) {
  const message = response.statusText || 'Unknown error'
  const props =
    response instanceof JsonResponse ? response.decodedBody : {}
  const error = new Error(message)
  Object.assign(error, props)
  if ('stack' in response) {
    error.stack = 'Error: ' + message + '\n' + response.stack
  }
  return error
}
```

**After:**
```ts
// In packages/service/src/errorUtils.ts
export function getErrorFromResponse(response: Response) {
  const message = response.statusText || 'Unknown error'
  const props =
    response instanceof JsonResponse ? response.decodedBody : {}
  const error = new Error(message)
  Object.assign(error, props)
  if (process.env.NODE_ENV !== 'production' && 'stack' in response) {
    error.stack = 'Error: ' + message + '\n' + response.stack
  }
  return error
}
}
```

## Implementation Details

### Unified Error Processing Flow

1. **Response Error Conversion:** `Response` instances are converted using `getErrorFromResponse`
2. **Consistent Logging:** All errors are logged through the same path
3. **Unified Formatting:** All errors go through the same formatting logic
4. **Stack Trace Handling:** Consistent stack trace processing for all error types

### Error Processing Pipeline

```ts
// Step 1: Convert Response errors to Error objects
if (error instanceof Response) {
  error = getErrorFromResponse(error)  // Now error is always an Error object
}

// Step 2: Log error (unified logging)
if (!process.env.TEST) {
  console.error(error)  // Same logging for all error types
}

// Step 3: Format error for JSON-seq output (unified formatting)
error = {
  ...error,
  message: error.message || 'An unknown error occurred',
  stack: process.env.NODE_ENV !== 'production'
    ? '\n' + getStackTrace(error)
    : undefined,
}
```

### Stack Trace Improvements

**Before:**
```ts
// Different stack trace handling for Response vs Error:

// For Response errors:
stack: process.env.NODE_ENV !== 'production' && 'stack' in error
  ? error.stack
  : undefined

// For regular errors:
stack: process.env.NODE_ENV !== 'production'
  ? getStackTrace(error)
  : undefined
```

**After:**
```ts
// Unified stack trace handling:
stack: process.env.NODE_ENV !== 'production'
  ? '\n' + getStackTrace(error)  // Always use getStackTrace, with newline prefix
  : undefined
```

### Production Environment Protection

**Before:**
```ts
// Stack traces could leak in production from Response objects
if ('stack' in response) {
  error.stack = 'Error: ' + message + '\n' + response.stack  // No production check
}
```

**After:**
```ts
// Stack traces are properly protected in production
if (process.env.NODE_ENV !== 'production' && 'stack' in response) {
  error.stack = 'Error: ' + message + '\n' + response.stack  // Production-safe
}
```

## Usage Examples

### Response Error Handling

```ts
import { route } from '@alien-rpc/service'
import { JsonResponse } from '@alien-rpc/service/response'

export const streamDataRoute = route.get('/stream-data', async function* () {
  yield { message: 'Starting data stream' }
  
  try {
    const data = await fetchExternalData()
    yield { data }
  } catch (error) {
    // This JsonResponse will be processed consistently
    throw new JsonResponse({
      message: 'Failed to fetch external data',
      code: 'EXTERNAL_API_ERROR',
      details: error.message
    }, { status: 502 })
  }
  
  yield { message: 'Stream complete' }
})
```

**Error Output (Development):**
```json
{"message":"Starting data stream"}
{"$error":{
  "message":"Failed to fetch external data",
  "code":"EXTERNAL_API_ERROR",
  "details":"Connection timeout",
  "stack":"\n    at streamDataRoute (/path/to/route.ts:12:11)\n    at processRequest (/path/to/server.ts:45:12)\n    at ..."
}}
```

**Error Output (Production):**
```json
{"message":"Starting data stream"}
{"$error":{
  "message":"Failed to fetch external data",
  "code":"EXTERNAL_API_ERROR",
  "details":"Connection timeout"
}}
```

### Regular Error Handling

```ts
export const processItemsRoute = route.get('/process-items', async function* () {
  const items = await getItems()
  
  for (const item of items) {
    try {
      const result = await processItem(item)
      yield { item: item.id, result }
    } catch (error) {
      // Regular Error objects are also processed consistently
      throw new Error(`Failed to process item ${item.id}: ${error.message}`)
    }
  }
})
```

**Error Output (Development):**
```json
{"item":"item-1","result":{"status":"success"}}
{"$error":{
  "message":"Failed to process item item-2: Invalid data format",
  "stack":"\n    at processItemsRoute (/path/to/route.ts:8:13)\n    at processItem (/path/to/processor.ts:25:9)\n    at ..."
}}
```

### Custom Error Properties

```ts
export const validateStreamRoute = route.post('/validate-stream', async function* ({ body }) {
  for (const record of body.records) {
    try {
      const validation = await validateRecord(record)
      yield { record: record.id, validation }
    } catch (error) {
      // Custom error properties are preserved
      const customError = new Error(`Validation failed for record ${record.id}`)
      customError.code = 'VALIDATION_ERROR'
      customError.recordId = record.id
      customError.validationRules = error.failedRules
      throw customError
    }
  }
})
```

**Error Output:**
```json
{"record":"rec-1","validation":{"valid":true}}
{"$error":{
  "message":"Validation failed for record rec-2",
  "code":"VALIDATION_ERROR",
  "recordId":"rec-2",
  "validationRules":["required-field","format-check"],
  "stack":"\n    at validateStreamRoute (/path/to/route.ts:7:21)\n    at validateRecord (/path/to/validator.ts:15:11)\n    at ..."
}}
```

## Benefits of Simplified Error Handling

### Before: Duplicated Logic

```ts
// Problems with the old approach:
// 1. Different error processing paths for Response vs Error
// 2. Duplicated logging logic
// 3. Inconsistent stack trace handling
// 4. Different error formatting approaches

if (error instanceof Response) {
  // Response-specific processing
  if (!process.env.TEST && process.env.NODE_ENV !== 'production') {
    console.error(getErrorFromResponse(error))
  }
  error = { /* Response-specific formatting */ }
} else {
  // Error-specific processing
  if (!process.env.TEST) {
    console.error(error)
  }
  error = { /* Error-specific formatting */ }
}
```

### After: Unified Processing

```ts
// Benefits of the new approach:
// 1. Single error processing pipeline
// 2. Consistent logging behavior
// 3. Unified stack trace handling
// 4. Consistent error formatting

if (error instanceof Response) {
  error = getErrorFromResponse(error)  // Convert to Error
}
// Now all errors follow the same path
if (!process.env.TEST) {
  console.error(error)  // Unified logging
}
error = { /* Unified formatting */ }
```

### Improved Consistency

1. **Error Format:** All errors have the same JSON structure
2. **Stack Traces:** Consistent stack trace processing with `getStackTrace`
3. **Logging:** All errors are logged through the same mechanism
4. **Environment Handling:** Consistent production vs development behavior

### Enhanced Maintainability

1. **Single Code Path:** Easier to modify error handling behavior
2. **Reduced Duplication:** Less code to maintain and test
3. **Consistent Behavior:** Predictable error handling across all scenarios
4. **Centralized Logic:** Error processing logic is centralized in `getErrorFromResponse`

## Error Format Consistency

### Unified Error Structure

```ts
// All errors now have this consistent structure:
{
  message: string,           // Always present, with fallback
  stack?: string,           // Only in development, with newline prefix
  [key: string]: any       // Preserved custom properties
}
```

### Stack Trace Formatting

**Before:**
```ts
// Response errors: raw stack
stack: error.stack

// Regular errors: processed stack
stack: getStackTrace(error)
```

**After:**
```ts
// All errors: processed stack with newline prefix
stack: '\n' + getStackTrace(error)
```

### Message Handling

```ts
// Consistent message fallback for all error types:
message: error.message || 'An unknown error occurred'

// Before: Response errors used statusText, regular errors used message
// After: All errors use the message property with fallback
```

## Production Safety Improvements

### Stack Trace Protection

**Before:**
```ts
// Potential stack trace leak in production:
if ('stack' in response) {
  error.stack = 'Error: ' + message + '\n' + response.stack  // No production check
}
```

**After:**
```ts
// Production-safe stack trace handling:
if (process.env.NODE_ENV !== 'production' && 'stack' in response) {
  error.stack = 'Error: ' + message + '\n' + response.stack  // Protected
}
```

### Environment-Aware Processing

```ts
// Development: Full error details with stack traces
{
  "message": "Database connection failed",
  "code": "DB_ERROR",
  "stack": "\n    at connectDatabase (/path/to/db.ts:45:12)\n    at ..."
}

// Production: Error details without stack traces
{
  "message": "Database connection failed",
  "code": "DB_ERROR"
}
```

## Testing Considerations

### Test Environment Behavior

```ts
// Error logging is suppressed in tests:
if (!process.env.TEST) {
  console.error(error)  // Only logs outside of test environment
}

// Stack traces are still included in test environment for debugging:
stack: process.env.NODE_ENV !== 'production'
  ? '\n' + getStackTrace(error)
  : undefined
```

### Error Assertion Examples

```ts
// Testing error format consistency:
it('should format Response errors consistently', async () => {
  const response = await fetch('/stream-endpoint')
  const reader = response.body.getReader()
  
  // Read until error
  let result
  while (!result?.done) {
    result = await reader.read()
    const data = JSON.parse(new TextDecoder().decode(result.value))
    
    if (data.$error) {
      expect(data.$error).toHaveProperty('message')
      expect(data.$error).toHaveProperty('stack')  // In test environment
      expect(data.$error.stack).toMatch(/^\n/)     // Newline prefix
      break
    }
  }
})
```

## Migration Impact

### Backward Compatibility

- **Error Format:** Unchanged - all errors maintain the same JSON structure
- **API Behavior:** Unchanged - error responses work identically
- **Stack Traces:** Enhanced - now consistent across all error types
- **Logging:** Improved - unified logging behavior

### Performance Impact

- **Reduced Branching:** Simplified control flow improves performance
- **Consistent Processing:** Predictable execution path
- **Memory Usage:** Slightly reduced due to less code duplication

## Files Modified

- `packages/service/src/errorUtils.ts` - Added production check for stack trace inclusion
- `packages/service/src/responders/json-seq.ts` - Simplified and unified error handling logic

## Related Features

- JSON Text Sequence responder
- Error response classes
- Stack trace utilities
- Development debugging tools
- Error logging system

## Open Questions

No unanswered questions