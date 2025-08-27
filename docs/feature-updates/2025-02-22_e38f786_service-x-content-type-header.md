# Service X-Content-Type Header for JSON Sequences

**Status: Enhancement**

**Commit:** e38f7867683f04b8bc55d91e869d65ab2cd4d1fe  
**Author:** Alec Larson  
**Date:** Sat Feb 22 21:33:02 2025 -0500  
**Short SHA:** e38f786

## Summary

Adds `X-Content-Type: application/json-seq` header to JSON Text Sequence responses for accurate middleware detection while maintaining `text/plain` compatibility.

## User-Visible Changes

- Added `X-Content-Type: application/json-seq` header to JSON streaming responses
- Enables middleware to distinguish JSON sequences from plain text responses
- Supports monitoring, analytics, and proxy configuration for streaming responses
- Non-breaking additive enhancement

## Examples

### Header Addition
```ts
const responder: RouteResponder = (route, args, ctx) => {
  ctx.response.headers.set('Content-Type', 'text/plain; charset=utf-8')
  ctx.response.headers.set('X-Content-Type', 'application/json-seq')
  return new Response(stream, ctx.response)
}
```

### Middleware Detection
```ts
const middleware = (req, res, next) => {
  if (res.get('X-Content-Type') === 'application/json-seq') {
    // Handle JSON streaming
    res.set('Cache-Control', 'no-cache')
  }
  next()
}
```

### Client Detection
```js
fetch('/api/stream').then(response => {
  if (response.headers.get('X-Content-Type') === 'application/json-seq') {
    return handleStreamingJSON(response)
  }
  return response.text()
})
```

## Config/Flags

- Automatic header addition to JSON sequence responses
- Primary `Content-Type` remains `text/plain; charset=utf-8`
- Uses JSON Text Sequence format (RFC 7464)

## Breaking/Migration

- Non-breaking additive enhancement
- No migration required
- Existing code continues to work unchanged

## Tags

`service` `headers` `json-sequences` `streaming` `middleware` `enhancement`

## Evidence

- Modified `packages/service/src/responders/json-seq.ts`
- Added `X-Content-Type: application/json-seq` header
- Maintained compatibility with existing `Content-Type`
