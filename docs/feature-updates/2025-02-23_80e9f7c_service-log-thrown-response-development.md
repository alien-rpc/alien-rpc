# Service Log Thrown Response in Development

**Commit:** 80e9f7c96b88db85230f39b9f905c8c720f97488
**Author:** Alec Larson
**Date:** Sun Feb 23 16:15:18 2025 -0500
**Short SHA:** 80e9f7c

## Summary

Enhances error logging in JSON Text Sequence responder by adding specific logging for thrown Response objects in development and improving error message format.

## User-Visible Changes

- **Enhanced development logging**: Thrown Response objects now logged with full context in development
- **Improved error format**: Response errors now use separate `code` and `message` fields instead of combined message
- **New createError utility**: Added utility function for creating errors with additional properties
- **Environment-aware logging**: Logging behavior varies by environment (development/production/test)
- **Better debugging**: Full Response object details visible in development console
- **Non-breaking**: Existing code continues to work unchanged
- **Test-friendly**: Logging suppressed in test environment for clean output

## Examples

### Enhanced Response Logging
```ts
// Development logging for thrown Response objects
if (error instanceof Response) {
  if (!process.env.TEST && process.env.NODE_ENV !== 'production') {
    console.error(createError('Thrown response', error))
  }
  error = {
    code: error.status,
    message: error.statusText,
    stack: process.env.NODE_ENV !== 'production' && 'stack' in error ? error.stack : undefined
  }
}
```

### Error Format Changes
```ts
// Before: Combined message
{ message: "404 Not Found" }

// After: Separate code and message
{ code: 404, message: "Not Found" }
```

### createError Utility
```ts
// New utility function
export function createError(message: string, props: any) {
  const error = new Error(message)
  Object.assign(error, props)
  if ('stack' in props) {
    error.stack = 'Error: ' + message + '\n' + props.stack
  }
  return error
}
```

## Config/Flags

- **Environment detection**: Uses `NODE_ENV` and `TEST` environment variables
- **Automatic behavior**: No configuration required, logging adapts to environment
- **Development**: Full Response logging enabled
- **Production**: All logging disabled for performance
- **Test**: Logging suppressed for clean output

## Breaking/Migration

- **Non-breaking**: Existing error handling continues to work unchanged
- **No migration**: Error format improvements are additive
- **Backward compatible**: Client code receives same error structure
- **Enhanced debugging**: Additional logging only in development

## Tags

`service` `logging` `development` `debugging` `json-seq` `error-handling` `response-objects`

## Evidence

- **Modified files**: `packages/service/src/errorUtils.ts`, `packages/service/src/responders/json-seq.ts`
- **New utility**: createError function for enhanced error creation
- **Environment-aware**: Logging behavior varies by NODE_ENV and TEST variables
- **Error format**: Response errors now use separate code/message fields
- **Development focus**: Enhanced debugging capabilities for development environment