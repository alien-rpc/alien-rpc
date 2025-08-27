# Service Simplify JSON-seq Error Handling

**Status:** Enhancement  
**Commit:** d9a6c47  
**Date:** February 23, 2025

## Summary

Simplified error handling in JSON Text Sequence responder by consolidating error processing logic and ensuring consistent error formatting.

## User-Visible Changes

- Consistent error format across all error types in JSON-seq responses
- Unified stack trace handling with newline prefix formatting
- Production-safe stack trace protection
- Consolidated error logging through single code path
- Fixed stack trace leaks in production environment

## Examples

### Response Error Handling
```ts
export const streamDataRoute = route.get('/stream-data', async function* () {
  yield { message: 'Starting data stream' }
  
  try {
    const data = await fetchExternalData()
    yield { data }
  } catch (error) {
    throw new JsonResponse({
      message: 'Failed to fetch external data',
      code: 'EXTERNAL_API_ERROR',
      details: error.message
    }, { status: 502 })
  }
})
```

### Error Output Format
```json
// Development
{"$error":{
  "message":"Failed to fetch external data",
  "code":"EXTERNAL_API_ERROR",
  "details":"Connection timeout",
  "stack":"\n    at streamDataRoute (/path/to/route.ts:12:11)\n    at ..."
}}

// Production
{"$error":{
  "message":"Failed to fetch external data",
  "code":"EXTERNAL_API_ERROR",
  "details":"Connection timeout"
}}
```

### Unified Error Processing
```ts
// Before: Different paths for Response vs Error
if (error instanceof Response) {
  error = { code: error.status, message: error.statusText, ... }
} else {
  error = { ...error, message: error.message || 'Unknown error', ... }
}

// After: Single processing pipeline
if (error instanceof Response) {
  error = getErrorFromResponse(error)
}
error = {
  ...error,
  message: error.message || 'An unknown error occurred',
  stack: process.env.NODE_ENV !== 'production' ? '\n' + getStackTrace(error) : undefined
}
```

## Config/Flags

- `NODE_ENV !== 'production'` - Controls stack trace inclusion
- `process.env.TEST` - Suppresses error logging in tests

## Breaking/Migration

**Breaking Changes:** None - internal refactoring only

**Migration:** No migration required

## Tags

`service` `error-handling` `json-seq` `refactoring` `production-safety` `logging`

## Evidence

**Error Processing:** Consolidated error processing eliminates code duplication  
**Logging:** Unified logging behavior for all error types  
**Security:** Production-safe stack trace handling prevents information leaks  
**Format:** Consistent error format with newline-prefixed stack traces  
**Maintainability:** Single code path improves maintainability and reduces branching