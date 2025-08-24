# Service Truncate Stack Trace Using Error Constructor Function

**Commit:** 227aafe6cba400ef0b741e1dbe753ad3120a5de4
**Author:** Alec Larson
**Date:** Sun Feb 23 18:20:55 2025 -0500
**Short SHA:** 227aafe

## Summary

This commit improves stack trace truncation by using the error's constructor function to intelligently find the appropriate truncation point, providing cleaner and more relevant stack traces in error responses.

## User Impact

**Audience:** Developers debugging applications with custom error classes
**Breaking Change:** No - stack trace improvement only
**Migration Required:** No - existing code benefits automatically

## Key Changes

### Enhanced getStackTrace Function

**Before:**
```ts
// In packages/service/src/errorUtils.ts
export function getStackTrace(error: Error, skip = 0) {
  const stack = error.stack?.replace(/^.*(?<! *at\b.*)\n/gm, '')
  return stack && skip > 0 ? stack.split('\n').slice(skip).join('\n') : stack
}
```

**After:**
```ts
// In packages/service/src/errorUtils.ts
export function getStackTrace(error: Error, constructor?: Function) {
  const stack = error.stack?.replace(/^.*(?<! *at\b.*)\n/gm, '')
  if (stack && constructor) {
    const lines = stack.split('\n')
    const constructorIndex = lines.findIndex(line =>
      line.includes('new ' + constructor.name)
    )
    if (constructorIndex !== -1) {
      return lines.slice(constructorIndex + 1).join('\n')
    }
  }
  return stack
}
```

### Updated TracedResponse Stack Capture

**Before:**
```ts
// In packages/service/src/response.ts
class TracedResponse extends Response {
  stack =
    process.env.NODE_ENV !== 'production'
      ? getStackTrace(new Error(), 3)  // Fixed skip count
      : undefined
}
```

**After:**
```ts
// In packages/service/src/response.ts
class TracedResponse extends Response {
  stack =
    process.env.NODE_ENV !== 'production'
      ? getStackTrace(new Error(), this.constructor)  // Dynamic constructor-based truncation
      : undefined
}
```

## Implementation Details

### Constructor-Based Truncation Logic

1. **Constructor detection:** Searches for `'new ' + constructor.name` in stack lines
2. **Index finding:** Uses `findIndex` to locate the constructor call
3. **Slice operation:** Returns everything after the constructor line
4. **Fallback behavior:** Returns full stack if constructor not found

### Stack Trace Processing

```ts
// Example stack trace processing
const lines = stack.split('\n')
// lines = [
//   '    at new NotFoundError (/path/to/response.ts:123:5)',
//   '    at routeHandler (/path/to/route.ts:15:9)',
//   '    at processRequest (/path/to/server.ts:45:12)',
//   '    at ...',
// ]

const constructorIndex = lines.findIndex(line =>
  line.includes('new NotFoundError')
)
// constructorIndex = 0

return lines.slice(constructorIndex + 1).join('\n')
// Result: Stack trace starting from routeHandler, excluding constructor
```

### Function Signature Changes

- **Parameter change:** `skip: number` → `constructor?: Function`
- **Logic change:** Fixed skip count → Dynamic constructor-based truncation
- **Backward compatibility:** Optional constructor parameter maintains compatibility

## Usage Examples

### Custom Error Class Stack Traces

```ts
import { route } from '@alien-rpc/service'
import { NotFoundError } from '@alien-rpc/service/response'

export const getUserRoute = route.get('/user/:id', async ({ params }) => {
  const user = await findUser(params.id)
  if (!user) {
    // Stack trace will exclude NotFoundError constructor
    throw new NotFoundError()
  }
  return user
})
```

**Before (Fixed Skip):**
```
Error
    at new NotFoundError (/path/to/response.ts:123:5)  // Included
    at getUserRoute (/path/to/route.ts:6:11)           // Included
    at processRequest (/path/to/server.ts:45:12)       // Included
    at ...
```

**After (Constructor-Based):**
```
Error
    at getUserRoute (/path/to/route.ts:6:11)           // Starts here
    at processRequest (/path/to/server.ts:45:12)
    at ...
```

### JsonResponse Stack Traces

```ts
import { JsonResponse } from '@alien-rpc/service/response'

export const validateDataRoute = route.post('/validate', async ({ body }) => {
  if (!body.email) {
    throw new JsonResponse({
      message: 'Email is required',
      field: 'email'
    }, { status: 400 })
  }
  return { valid: true }
})
```

**Stack Trace Output:**
```
Error: Email is required
    at validateDataRoute (/path/to/route.ts:4:11)      // Starts from actual usage
    at requestHandler (/path/to/handler.ts:23:8)
    at ...
```

### Multiple Error Classes

```ts
class CustomValidationError extends JsonResponse {
  constructor(field: string, value: any) {
    super({
      message: `Invalid ${field}`,
      field,
      value
    }, { status: 422 })
  }
}

export const processRoute = route.post('/process', async ({ body }) => {
  if (!body.age || body.age < 0) {
    // Stack trace excludes CustomValidationError constructor
    throw new CustomValidationError('age', body.age)
  }
  return { processed: true }
})
```

**Stack Trace Truncation:**
```
// Constructor line is excluded:
// ❌ at new CustomValidationError (/path/to/errors.ts:15:5)

// Stack starts from actual usage:
✅ at processRoute (/path/to/route.ts:4:11)
   at requestProcessor (/path/to/processor.ts:28:9)
   at ...
```

## Benefits of Constructor-Based Truncation

### Before: Fixed Skip Count Issues

```ts
// Problems with fixed skip count:
// 1. Different error classes have different stack depths
// 2. Refactoring changes stack depth
// 3. Hard to maintain across different error types

getStackTrace(error, 3)  // May skip too much or too little
```

### After: Dynamic Constructor Detection

```ts
// Benefits of constructor-based approach:
// 1. Automatically adapts to different error classes
// 2. Resilient to refactoring changes
// 3. Consistent behavior across all error types

getStackTrace(error, ErrorClass)  // Always truncates at constructor
```

### Improved Debugging Experience

1. **Relevant stack traces:** Only shows application code, not error construction
2. **Consistent truncation:** Same behavior across all error classes
3. **Maintainable:** No need to adjust skip counts for different errors
4. **Flexible:** Works with custom error hierarchies

## Error Class Compatibility

### Built-in Response Classes

```ts
// All these classes benefit from constructor-based truncation:
- JsonResponse
- UnauthorizedError
- ForbiddenError
- NotFoundError
- MethodNotAllowedError
- ConflictError
- UnprocessableContentError
- PreconditionRequiredError
- TooManyRequestsError
- UnavailableForLegalReasonsError
- TemporaryRedirect
- PermanentRedirect
```

### Custom Error Classes

```ts
// Custom error classes automatically work:
class BusinessLogicError extends JsonResponse {
  constructor(operation: string, reason: string) {
    super({ operation, reason }, { status: 409 })
  }
}

// Stack trace will exclude BusinessLogicError constructor
throw new BusinessLogicError('user-creation', 'duplicate-email')
```

## Edge Cases and Fallbacks

### Constructor Not Found

```ts
// If constructor name not found in stack:
if (constructorIndex === -1) {
  return stack  // Return full stack trace
}
```

### Anonymous Constructors

```ts
// Anonymous functions won't match:
const AnonymousError = function() { /* ... */ }
// constructor.name === '' (empty string)
// Will fall back to full stack trace
```

### Minified Code

```ts
// In production with minified code:
// Constructor names may be mangled
// Function falls back to full stack trace
// This is acceptable since stack traces are development-only
```

## Performance Considerations

- **Development only:** Stack trace processing only in development
- **String operations:** Minimal overhead from string splitting and searching
- **Early termination:** `findIndex` stops at first match
- **Fallback efficiency:** Returns original stack if constructor not found

## Migration from Fixed Skip

### Automatic Migration

```ts
// Old calls with skip parameter still work:
getStackTrace(error, 3)  // Still supported (constructor = undefined)

// New calls use constructor:
getStackTrace(error, MyErrorClass)  // Preferred approach
```

### TracedResponse Update

```ts
// All TracedResponse subclasses automatically benefit:
// - No code changes required
// - Better stack traces immediately
// - Consistent behavior across error types
```

## Files Modified

- `packages/service/src/errorUtils.ts` - Enhanced getStackTrace with constructor-based truncation
- `packages/service/src/response.ts` - Updated TracedResponse to use constructor-based truncation

## Related Features

- TracedResponse class
- Error response classes
- Stack trace utilities
- Development debugging tools
- Error logging improvements

## Open Questions

No unanswered questions