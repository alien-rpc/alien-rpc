# Service WebSocket Error Stack Traces

**Commit:** 513843f  
**Date:** February 23, 2025  
**Type:** Enhancement  
**Breaking Change:** ❌ No

## Summary

Enhances WebSocket error handling by including stack traces in error responses during development and improving the structure of error data sent to WebSocket clients. Provides better debugging experience while maintaining security in production.

## User-Visible Changes

- **Development stack traces**: Full stack traces included in WebSocket error responses during development
- **Structured error data**: Improved error response format with separated `data` field for custom properties
- **Environment-aware**: Stack traces automatically omitted in production for security
- **Enhanced debugging**: Better error information for JsonResponse, validation, and general errors
- **Backward compatible**: Existing error handling continues to work unchanged

## Examples

### WebSocket Error with Stack Trace

```ts
export const wsRoute = route.ws('/api/data', {
  async onMessage(data, { send }) {
    if (!data.userId) {
      throw new JsonResponse({
        code: 'MISSING_USER_ID',
        message: 'User ID is required',
        details: 'The userId field must be provided'
      }, { status: 400 })
    }
    send({ result: 'success' })
  }
})
```

**Development Response:**
```json
{
  "id": "req-123",
  "error": {
    "code": "MISSING_USER_ID",
    "message": "User ID is required",
    "data": { "details": "The userId field must be provided" },
    "stack": "Error\n    at onMessage (/path/to/route.ts:8:13)\n    at ..."
  }
}
```

**Production Response:**
```json
{
  "id": "req-123",
  "error": {
    "code": "MISSING_USER_ID",
    "message": "User ID is required",
    "data": { "details": "The userId field must be provided" }
  }
}
```

## Config/Flags

- Stack traces automatically enabled in development (`NODE_ENV !== 'production'`)
- No configuration options - behavior is environment-based

## Breaking/Migration

- **Breaking Change:** ❌ No
- **Migration Required:** ❌ No
- Existing error handling continues to work unchanged
- New stack trace field is additive only

## Tags

`websocket` `error-handling` `debugging` `development` `stack-traces`

## Evidence

**Files Modified:**
- `packages/service/src/compileRoutes.ts`

**Key Features:**
- Development stack traces in WebSocket errors
- Structured error data with separated `data` field
- Environment-aware stack trace inclusion
- Enhanced JsonResponse error handling