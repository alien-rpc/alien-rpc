# JSON Sequence Error Forwarding

**Commit:** 340045e
**Date:** 2024-12-19
**Type:** feat(json-seq)
**Breaking:** No

## Summary

Added error forwarding capability for JSON Text Sequence responses when errors occur after response headers have been sent. This ensures that streaming errors are properly communicated to the client instead of being silently lost.

## Technical Changes

### Server-side (`packages/service/src/responders/json-seq.ts`)

- Enhanced `generateJsonTextSequence` function with comprehensive error handling
- Errors occurring during streaming are now caught and wrapped in `{ $error: ... }` objects
- Error objects include message, stack trace (in development), and other error properties
- Response objects are converted to proper error format using `getErrorFromResponse`

### Client-side (`packages/client/src/formats/json-seq.ts`)

- Added `isRouteError` function to detect error objects in the JSON sequence
- Error objects are automatically converted back to proper Error instances
- Stack traces are resolved using source maps in development mode
- Errors are thrown to the consuming code, maintaining proper error flow

## User-Visible Impact

### For API Developers

- **Improved Error Handling**: Errors in streaming routes are no longer lost when they occur after headers are sent
- **Better Debugging**: Stack traces are preserved and source-mapped in development
- **Consistent Behavior**: Error handling now works the same way for both regular and streaming responses

### For API Consumers

- **Reliable Error Detection**: Streaming errors are properly thrown as Error instances
- **Better Error Messages**: Full error context is preserved including custom properties
- **Consistent Error Handling**: Can use standard try/catch blocks for both sync and streaming operations

## Code Examples

### Server-side Streaming with Error Handling

```ts
import { route } from '@alien-rpc/service'

export const streamPosts = route.get('/posts', async function* () {
  yield { id: 1, title: 'First post' }

  // If an error occurs here, it will be sent to the client
  if (someCondition) {
    throw new Error('Something went wrong during streaming')
  }

  yield { id: 2, title: 'Second post' }
})
```

### Client-side Error Handling

```ts
const client = defineClient(API)

try {
  for await (const post of client.streamPosts()) {
    console.log('Received post:', post)
  }
} catch (error) {
  // Errors from the server stream are caught here
  console.error('Stream error:', error.message)
  console.error('Stack trace:', error.stack)
}
```

## Implementation Details

### Error Object Format

Errors are serialized in the JSON sequence as:

```json
{
  "$error": {
    "message": "Error message",
    "stack": "Stack trace (development only)",
    "...otherProperties": "Additional error properties"
  }
}
```

### Reserved Object Shapes

The following object shapes are reserved in JSON sequences:

- `{ $error: any }` - Error objects
- `{ $prev: any, $next: any }` - Pagination objects

### Error Detection

The client uses `hasExactKeyCount` to ensure error objects have exactly one key (`$error`) to avoid false positives with user data.

## Related Files

- `packages/service/src/responders/json-seq.ts` - Server-side error handling
- `packages/client/src/formats/json-seq.ts` - Client-side error parsing
- `packages/service/src/errorUtils.ts` - Error utility functions
- `packages/service/readme.md` - Updated documentation
- `packages/client/readme.md` - Updated documentation

## Migration Notes

This is a non-breaking change. Existing streaming routes will automatically benefit from improved error handling without any code changes required.

## Testing Considerations

- Test error scenarios in streaming routes
- Verify error objects are properly formatted
- Ensure stack traces are available in development
- Test client-side error throwing and catching
- Verify no false positives with user data containing `$error` keys

## Open Questions

### Critical

- How are different error types (Error, custom errors, Response objects) serialized and what are their exact type contracts in the JSON sequence?
- What happens if an error object has circular references during JSON.stringify serialization?
- Can custom error classes be preserved across the JSON sequence boundary, and if not, what type information is lost?
- What is the exact type signature of the `isRouteError` function and how does it prevent false positives?

### High

- What are the TypeScript types for error objects in the JSON sequence format `{ $error: ... }`?
- How does the client-side `Object.assign(new Error(), value.$error)` affect the Error prototype chain and what types are preserved?
- Are there specific TypeScript patterns recommended for handling streaming errors vs regular errors?

### Medium

- What TypeScript utilities are available for testing error scenarios in streaming routes?
- How should developers type custom error properties that get serialized through the JSON sequence?
