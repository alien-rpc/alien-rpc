# JSON Sequence Error Forwarding

**Commit:** `340045e` (2024-12-19)

## Summary

Added error forwarding capability for JSON Text Sequence responses when errors occur after response headers have been sent. This ensures that streaming errors are properly communicated to the client instead of being silently lost.

## User-visible Changes

- Improved error handling for streaming routes - errors no longer lost after headers sent
- Better debugging with preserved stack traces and source maps in development
- Consistent error behavior between regular and streaming responses
- Reliable error detection with proper Error instances thrown to client
- Full error context preserved including custom properties
- Standard try/catch blocks work for both sync and streaming operations

## Examples

### Server-side Streaming with Error Handling

```typescript
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

```typescript
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

### Error Object Format

```json
// Errors are serialized in the JSON sequence as:
{
  "$error": {
    "message": "Error message",
    "stack": "Stack trace (development only)",
    "...otherProperties": "Additional error properties"
  }
}
```

### Reserved Object Shapes

```typescript
// The following object shapes are reserved in JSON sequences:
// - { $error: any } - Error objects
// - { $prev: any, $next: any } - Pagination objects

// Client uses hasExactKeyCount to ensure error objects have exactly
// one key ($error) to avoid false positives with user data
function isRouteError(value: any): boolean {
  return hasExactKeyCount(value, 1) && '$error' in value
}
```

## Config/Flags

No configuration required. Error forwarding works automatically for all streaming routes.

## Breaking/Migration

No breaking changes. Existing streaming routes automatically benefit from improved error handling without code changes.

## Tags

- json-seq
- streaming
- error-handling
- client
- service
- debugging
- non-breaking

## Evidence

- Updated `packages/service/src/responders/json-seq.ts` (server-side error handling)
- Updated `packages/client/src/formats/json-seq.ts` (client-side error parsing)
- Updated `packages/service/src/errorUtils.ts` (error utility functions)
- Updated `packages/service/readme.md` (documentation)
- Updated `packages/client/readme.md` (documentation)
