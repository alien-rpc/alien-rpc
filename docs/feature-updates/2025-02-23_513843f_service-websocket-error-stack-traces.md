# Service WebSocket Error Stack Traces

**Commit:** 513843f25b5c6d5e818f848915c8fb7cb5c99eda
**Author:** Alec Larson
**Date:** Sun Feb 23 16:15:18 2025 -0500
**Short SHA:** 513843f

## Summary

This commit enhances WebSocket error handling by including stack traces in error responses during development and improving the structure of error data sent to WebSocket clients.

## User Impact

**Audience:** Developers using WebSocket routes who need better error debugging
**Breaking Change:** No - additive enhancement to error responses
**Migration Required:** No - existing error handling continues to work

## Key Changes

### Enhanced Response Error Handling

```ts
// In packages/service/src/compileRoutes.ts
if (error instanceof Response) {
  const {
    code = error.status,
    message = error.statusText,
    ...data
  } = error instanceof JsonResponse ? error.decodedBody : {}

  peer.send({
    id,
    error: {
      code,
      message,
      data: Object.keys(data).length ? data : undefined,
      stack:
        process.env.NODE_ENV !== 'production' && 'stack' in error
          ? error.stack
          : undefined,
    },
  })
}
```

### Validation Error Stack Traces

```ts
// Schema validation errors
peer.send({
  id,
  error: {
    code: 400,
    message,
    data: { path, value },
    stack:
      process.env.NODE_ENV !== 'production'
        ? getStackTrace(checkError)
        : undefined,
  },
})
```

### General Error Stack Traces

```ts
// General error handling
peer.send({
  id,
  error: {
    code: 500,
    message: isError(error) ? error.message : String(error),
    stack:
      process.env.NODE_ENV !== 'production' && isError(error)
        ? getStackTrace(error)
        : undefined,
  },
})
```

## Implementation Details

### Error Response Structure

**Before:**
```ts
// Response errors
{
  id: 'request-id',
  error: {
    code: 404,
    message: 'Not Found',
    ...decodedBody  // All properties mixed in
  }
}

// General errors
{
  id: 'request-id', 
  error: {
    code: 500,
    message: 'Internal Server Error'
  }
}
```

**After:**
```ts
// Response errors (Development)
{
  id: 'request-id',
  error: {
    code: 404,
    message: 'Not Found',
    data: { /* custom error data */ },
    stack: 'Error\n    at routeHandler (/path/to/route.ts:15:9)\n    at ...'
  }
}

// General errors (Development)
{
  id: 'request-id',
  error: {
    code: 500,
    message: 'Internal Server Error',
    stack: 'Error: Database connection failed\n    at ...'
  }
}

// Production (no stack traces)
{
  id: 'request-id',
  error: {
    code: 500,
    message: 'Internal Server Error'
  }
}
```

### JsonResponse Error Data Extraction

```ts
// Separates standard error fields from custom data
const {
  code = error.status,      // Use custom code or fallback to status
  message = error.statusText, // Use custom message or fallback to statusText
  ...data                   // Everything else goes in data field
} = error instanceof JsonResponse ? error.decodedBody : {}
```

### Stack Trace Integration

- **Response objects:** Uses `error.stack` if available
- **Validation errors:** Uses `getStackTrace(checkError)`
- **General errors:** Uses `getStackTrace(error)` for Error instances
- **Environment gating:** Only included when `NODE_ENV !== 'production'`

## Usage Examples

### Custom JsonResponse with Stack Trace

```ts
import { route } from '@alien-rpc/service'
import { JsonResponse } from '@alien-rpc/service/response'

export const wsRoute = route.ws('/api/data', {
  async onMessage(data, { send }) {
    if (!data.userId) {
      // Custom error with additional data
      throw new JsonResponse({
        code: 'MISSING_USER_ID',
        message: 'User ID is required',
        details: 'The userId field must be provided in the request data',
        timestamp: new Date().toISOString()
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
    "data": {
      "details": "The userId field must be provided in the request data",
      "timestamp": "2025-02-23T21:15:18.000Z"
    },
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
    "data": {
      "details": "The userId field must be provided in the request data",
      "timestamp": "2025-02-23T21:15:18.000Z"
    }
  }
}
```

### Schema Validation Error

```ts
export const wsRoute = route.ws('/api/user', {
  params: z.object({
    id: z.number().min(1)
  }),
  
  async onMessage(data, { send }) {
    // If data.id is invalid, validation error with stack trace
    send({ user: await getUser(data.id) })
  }
})
```

**Development Response:**
```json
{
  "id": "req-456",
  "error": {
    "code": 400,
    "message": "Validation failed",
    "data": {
      "path": "id",
      "value": -1
    },
    "stack": "ZodError\n    at z.number.min (/node_modules/zod/...)\n    at ..."
  }
}
```

### General Error Handling

```ts
export const wsRoute = route.ws('/api/process', {
  async onMessage(data, { send }) {
    try {
      const result = await processData(data)
      send({ result })
    } catch (error) {
      // This will include stack trace in development
      throw error
    }
  }
})
```

**Development Response:**
```json
{
  "id": "req-789",
  "error": {
    "code": 500,
    "message": "Database connection timeout",
    "stack": "Error: Database connection timeout\n    at Database.connect (/path/to/db.ts:45:11)\n    at ..."
  }
}
```

## Error Type Handling

### Response Objects

1. **JsonResponse instances:** Extract `decodedBody` and separate standard fields
2. **Other Response types:** Use status and statusText as defaults
3. **Stack trace preservation:** Include `error.stack` if present
4. **Data organization:** Custom properties grouped under `data` field

### Validation Errors

1. **Schema validation:** Zod/other validation library errors
2. **Path information:** Include field path and invalid value
3. **Stack trace generation:** Use `getStackTrace()` utility
4. **Standard format:** Consistent 400 error code

### General Errors

1. **Error instances:** Extract message and generate stack trace
2. **Non-Error values:** Convert to string for message
3. **Stack trace conditional:** Only for actual Error instances
4. **Fallback handling:** Graceful degradation for unknown error types

## Development vs Production

### Development Environment

- **Full stack traces:** Complete call stacks included in all error types
- **Debugging information:** Maximum detail for troubleshooting
- **Source mapping:** Stack traces point to original source files
- **Performance impact:** Minimal since only on error paths

### Production Environment

- **No stack traces:** Omitted for security and performance
- **Clean error messages:** Only essential information exposed
- **Reduced payload size:** Smaller WebSocket messages
- **Security compliance:** No internal implementation details leaked

## Security Considerations

- **Stack trace exposure:** Only in development environments
- **Error message sanitization:** Custom messages preserved, system details hidden
- **Data field isolation:** Custom error data clearly separated
- **Environment detection:** Proper NODE_ENV checking

## Performance Impact

- **Development overhead:** Stack trace generation only on errors
- **Production optimization:** Zero overhead when disabled
- **Memory usage:** Stack traces garbage collected with error objects
- **Network efficiency:** Smaller payloads in production

## Files Modified

- `packages/service/src/compileRoutes.ts` - Enhanced WebSocket error handling with stack traces

## Related Features

- WebSocket route handling
- Error response classes
- Stack trace utilities
- Development debugging tools
- JsonResponse error data extraction

## Open Questions

No unanswered questions