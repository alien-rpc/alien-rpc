# Service Handle Thrown Response in JSON Sequence

**Commit:** 1db86bb  
**Date:** February 23, 2025  
**Type:** Enhancement  
**Breaking Change:** ❌ No

## Summary

Enhances the JSON Text Sequence responder to properly handle thrown Response objects and improves error handling with better stack trace management. Introduces a TracedResponse class that captures stack traces for debugging purposes during development.

## User-Visible Changes

- **Response object handling**: Thrown Response objects properly handled in JSON streaming routes
- **Stack trace capture**: TracedResponse class automatically captures stack traces in development
- **Enhanced error format**: Better error messages with status extraction from Response objects
- **Development debugging**: Full stack traces included in error responses during development
- **Backward compatible**: Existing code continues to work unchanged

## Examples

```ts
// Throwing Response objects in streaming routes
export const streamData = route.get('/stream', async function* () {
  for (let i = 0; i < 10; i++) {
    if (i === 5) throw new NotFoundError()
    yield { item: i }
  }
})

// Error response format
// Development: {"$error":{"message":"404 Not Found","stack":"..."}}
// Production: {"$error":{"message":"404 Not Found"}}
```

## Config/Flags

- Stack traces only included in development (`NODE_ENV !== 'production'`)
- All HTTP error response classes now extend `TracedResponse`

## Breaking/Migration

- **Breaking**: None
- **Migration**: Existing code continues to work unchanged

## Tags

`json-seq`, `error-handling`, `stack-traces`, `debugging`, `response-objects`

## Evidence

- **Files modified**: `compileRoutes.ts`, `errorUtils.ts`, `json-seq.ts`, `response.ts`
- **New features**: TracedResponse class, enhanced error handling in JSON-seq responder
- **Developer experience**: Better debugging with stack traces in development