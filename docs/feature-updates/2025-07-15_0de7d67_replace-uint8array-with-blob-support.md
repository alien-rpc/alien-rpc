# Replace Uint8Array Body Support with Blob

**Status:** Breaking Change  
**Commit:** 0de7d67  
**Date:** 2025-07-15

## Summary

Breaking change that replaces `Uint8Array` request body support with `Blob` support in alien-rpc. Routes now use `Blob` as the standard binary body type, providing better web standards compatibility and more flexible binary data handling.

## User-Visible Changes

- `Uint8Array` body type no longer supported in route definitions
- `Blob` is now the primary binary body type for routes
- Blob includes content-type and size information automatically
- Better compatibility with File API, fetch, and streaming
- Updated type inference to use `Blob` instead of `Uint8Array`
- Automatic blob content parsing with content-type detection
- Migration required for existing `Uint8Array` routes

## Examples

```ts
// Before: Uint8Array route handler
export const uploadBinary = defineRoute({
  method: 'POST',
  path: '/api/upload/binary',
  handler: async (pathParams: {}, searchParams: {}, body: Uint8Array) => {
    console.log('Received binary data:', body.length, 'bytes')
    return { success: true, size: body.length }
  }
})

// After: Blob route handler
export const uploadBinary = defineRoute({
  method: 'POST',
  path: '/api/upload/binary',
  handler: async (pathParams: {}, searchParams: {}, body: Blob) => {
    console.log('Received binary data:', body.size, 'bytes')
    console.log('Content type:', body.type)
    return { success: true, size: body.size, type: body.type }
  }
})

// Client usage changes
// Before: Client sending Uint8Array
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
const result = await client.uploadBinary({ body: binaryData })

// After: Client sending Blob
const blob = new Blob([binaryData], { type: 'application/octet-stream' })
const result = await client.uploadBinary({ body: blob })

// File API for file uploads
const fileInput = document.getElementById('file-input') as HTMLInputElement
const file = fileInput.files?.[0]
if (file) {
  const result = await client.uploadBinary({ body: file })
}

// Binary data processing
// Before: Direct Uint8Array processing
function processUint8Array(data: Uint8Array) {
  return data.slice(0, 100)
}

// After: Blob processing with async methods
async function processBlob(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  return uint8Array.slice(0, 100)
}

// Stream processing for large blobs
async function processBlobStream(blob: Blob) {
  const stream = blob.stream()
  const reader = stream.getReader()
  // Process stream chunks...
}
```

## Config/Flags

- Blob support is automatically enabled
- No additional setup required
- Requires code changes for existing `Uint8Array` usage

## Breaking/Migration

- **Breaking**: `Uint8Array` body type no longer supported; Update route definitions to use `Blob` instead of `Uint8Array`; Convert `Uint8Array` to `Blob` in client requests; Update type annotations from `Uint8Array` to `Blob`
- **Migration**: Update route definitions to use `Blob` instead of `Uint8Array`; Convert `Uint8Array` to `Blob` in client requests; Update type annotations from `Uint8Array` to `Blob`

## Tags

`breaking`, `binary-data`, `blob`, `uint8array`, `web-standards`, `file-api`, `content-type`, `migration-required`

## Evidence

- **Modified files**: Route type inference system, HTTP protocol handler, server-side request parsing, TypeBox code generation
- **Route type inference**: Updated to use `Blob` instead of `Uint8Array`
- **HTTP protocol handler**: Modified to detect `Blob` instances
- **Server-side parsing**: Updated request parsing for blob content
- **TypeBox generation**: Updated code generation for `Blob` types
- **Removed support**: `Uint8Array` body type support from route definitions