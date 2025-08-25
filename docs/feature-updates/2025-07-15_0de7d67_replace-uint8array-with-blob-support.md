# Replace Uint8Array Body Support with Blob

**Commit:** 0de7d673dc297a05f0325cfdf9f2258b19415ef3  
**Author:** Alec Larson  
**Date:** Tue Jul 15 02:51:37 2025 -0400  
**Short SHA:** 0de7d67

## Summary

This is a **breaking change** that replaces `Uint8Array` request body support with `Blob` support in alien-rpc. Routes now use `Blob` as the standard binary body type, providing better compatibility with web standards and more flexible binary data handling.

## User Impact

**Audience:** Developers using binary data in route definitions and client requests  
**Breaking Change:** Yes - `Uint8Array` body type no longer supported  
**Migration Required:** Yes - update route definitions and client code  
**Status:** Breaking - requires code changes for binary data handling

## Key Changes

### Removed
- `Uint8Array` as a supported request body type
- Type inference for `Uint8Array` bodies in route functions
- Runtime detection of `Uint8Array` instances in HTTP protocol handler

### Added
- `Blob` as the primary binary body type
- Enhanced server-side blob handling with automatic content-type detection
- Type generation support for `Blob` types in TypeBox codegen
- Improved request parsing for blob content

### Changed
- Route type inference now uses `Blob` instead of `Uint8Array`
- HTTP protocol handler detects `Blob` instances instead of `Uint8Array`
- Server-side request parsing handles blob content automatically

## Breaking Changes

### Route Definition Changes

**Before:**
```ts
// Route accepting Uint8Array body
export const uploadBinary = defineRoute({
  method: 'POST',
  path: '/api/upload/binary',
  handler: async (pathParams: {}, searchParams: {}, body: Uint8Array) => {
    console.log('Received binary data:', body.length, 'bytes')
    return { success: true, size: body.length }
  }
})
```

**After:**
```ts
// Route accepting Blob body
export const uploadBinary = defineRoute({
  method: 'POST',
  path: '/api/upload/binary',
  handler: async (pathParams: {}, searchParams: {}, body: Blob) => {
    console.log('Received binary data:', body.size, 'bytes')
    console.log('Content type:', body.type)
    return { success: true, size: body.size, type: body.type }
  }
})
```

### Client Usage Changes

**Before:**
```ts
// Client sending Uint8Array
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])

const result = await client.uploadBinary({
  body: binaryData
})
```

**After:**
```ts
// Client sending Blob (Uint8Array still works as input)
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])
const blob = new Blob([binaryData], { type: 'application/octet-stream' })

const result = await client.uploadBinary({
  body: blob
})

// Or directly with Uint8Array (automatically converted)
const result = await client.uploadBinary({
  body: binaryData // Still works - converted to Blob internally
})
```

### Type System Changes

**Before:**
```ts
// Type inference for Uint8Array bodies
type RouteFunction<TRoute, TErrorMode extends ErrorMode> =
  TRoute extends Route<
    (pathParams: any, searchParams: any, body: infer TBody) => any
  >
    ? TBody extends Uint8Array
      ? { body: TBody }
      : TBody
```

**After:**
```ts
// Type inference for Blob bodies
type RouteFunction<TRoute, TErrorMode extends ErrorMode> =
  TRoute extends Route<
    (pathParams: any, searchParams: any, body: infer TBody) => any
  >
    ? TBody extends Blob
      ? { body: TBody }
      : TBody
```

## Migration Guide

### Step 1: Update Route Definitions

```ts
// Before: Uint8Array route handler
export const processImage = defineRoute({
  method: 'POST',
  path: '/api/image/process',
  handler: async (pathParams: {}, searchParams: {}, body: Uint8Array) => {
    const imageBuffer = Buffer.from(body)
    const processedImage = await processImageBuffer(imageBuffer)
    return { processedSize: processedImage.length }
  }
})

// After: Blob route handler
export const processImage = defineRoute({
  method: 'POST',
  path: '/api/image/process',
  handler: async (pathParams: {}, searchParams: {}, body: Blob) => {
    const arrayBuffer = await body.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)
    const processedImage = await processImageBuffer(imageBuffer)
    return { 
      processedSize: processedImage.length,
      originalType: body.type,
      originalSize: body.size
    }
  }
})
```

### Step 2: Update Client Code

```ts
// Before: Direct Uint8Array usage
const imageData = new Uint8Array(await readFile('./image.jpg'))
const result = await client.processImage({ body: imageData })

// After: Convert to Blob
const imageData = new Uint8Array(await readFile('./image.jpg'))
const imageBlob = new Blob([imageData], { type: 'image/jpeg' })
const result = await client.processImage({ body: imageBlob })

// Or use File API for file uploads
const fileInput = document.getElementById('file-input') as HTMLInputElement
const file = fileInput.files?.[0]
if (file) {
  const result = await client.processImage({ body: file })
}
```

### Step 3: Handle Content Types

```ts
// Before: Manual content-type handling
const binaryData = new Uint8Array([...])
const result = await client.uploadData(
  { body: binaryData },
  { headers: { 'Content-Type': 'application/octet-stream' } }
)

// After: Content-type included in Blob
const binaryData = new Uint8Array([...])
const blob = new Blob([binaryData], { type: 'application/octet-stream' })
const result = await client.uploadData({ body: blob })
```

### Step 4: Update Binary Data Processing

```ts
// Before: Direct Uint8Array processing
function processUint8Array(data: Uint8Array) {
  return data.slice(0, 100) // Get first 100 bytes
}

// After: Blob processing with async methods
async function processBlob(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  return uint8Array.slice(0, 100) // Get first 100 bytes
}

// Or use streams for large blobs
async function processBlobStream(blob: Blob) {
  const stream = blob.stream()
  const reader = stream.getReader()
  
  const chunks: Uint8Array[] = []
  let totalSize = 0
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    chunks.push(value)
    totalSize += value.length
    
    if (totalSize >= 100) break // Process first 100 bytes
  }
  
  return chunks
}
```

## Implementation Details

### Server-Side Request Parsing

**Before:**
```ts
// Simple JSON or empty object parsing
const requestData = request.headers.get('Content-Type') === 'application/json'
  ? await request.json()
  : {}
```

**After:**
```ts
// Enhanced parsing with blob support
const requestData = request.headers.get('Content-Type') === 'application/json'
  ? await request.json()
  : request.headers.has('Content-Type')
    ? await request.blob()
    : {}
```

### Client-Side Type Detection

**Before:**
```ts
// Uint8Array detection
if (params.body instanceof Uint8Array) {
  request.body = params.body
}
```

**After:**
```ts
// Blob detection
if (params.body instanceof Blob) {
  request.body = params.body
}
```

### TypeBox Code Generation

**Before:**
```ts
// No specific handling for Uint8Array in TypeBox
if (name === 'Uint8Array') {
  yield `Type.Uint8Array()`
}
```

**After:**
```ts
// Blob support in TypeBox generation
if (name === 'Uint8Array') {
  yield `Type.Uint8Array()`
} else if (name === 'Blob') {
  yield `Type.Any()` // Blob represented as Any type
}
```

## Advantages of Blob over Uint8Array

### Web Standards Compatibility
- **Native Web API:** Blob is a standard Web API supported across all browsers
- **File API Integration:** Works seamlessly with File API and drag-and-drop
- **Fetch API:** Native support in fetch requests without conversion
- **Streaming:** Built-in streaming capabilities for large binary data

### Enhanced Metadata
- **Content Type:** Blob includes MIME type information
- **Size Information:** Built-in size property for efficient handling
- **Immutability:** Blob contents are immutable, preventing accidental modification
- **Memory Efficiency:** Better memory management for large binary data

### Developer Experience
- **Type Safety:** Better TypeScript integration with web APIs
- **Debugging:** Easier to inspect blob properties in developer tools
- **Consistency:** Unified approach to binary data across client and server
- **Future-Proof:** Aligns with evolving web standards

## Usage Examples

### File Upload with Blob

```ts
// Route definition
export const uploadFile = defineRoute({
  method: 'POST',
  path: '/api/files/upload',
  handler: async (pathParams: {}, searchParams: { filename: string }, body: Blob) => {
    const buffer = Buffer.from(await body.arrayBuffer())
    const savedPath = await saveFile(searchParams.filename, buffer)
    
    return {
      id: generateId(),
      filename: searchParams.filename,
      size: body.size,
      type: body.type,
      path: savedPath
    }
  }
})

// Client usage
const fileInput = document.getElementById('file') as HTMLInputElement
const file = fileInput.files?.[0]

if (file) {
  const result = await client.uploadFile(
    { filename: file.name },
    { body: file }
  )
  console.log('File uploaded:', result.id)
}
```

### Image Processing with Blob

```ts
// Route definition
export const resizeImage = defineRoute({
  method: 'POST',
  path: '/api/images/resize',
  handler: async (
    pathParams: {},
    searchParams: { width: number; height: number },
    body: Blob
  ) => {
    if (!body.type.startsWith('image/')) {
      throw new Error('Invalid image type')
    }
    
    const imageBuffer = Buffer.from(await body.arrayBuffer())
    const resizedBuffer = await resizeImage(imageBuffer, searchParams.width, searchParams.height)
    
    return new Blob([resizedBuffer], { type: body.type })
  }
})

// Client usage
const canvas = document.getElementById('canvas') as HTMLCanvasElement
canvas.toBlob(async (blob) => {
  if (blob) {
    const resizedBlob = await client.resizeImage(
      { width: 800, height: 600 },
      { body: blob }
    )
    
    // Display resized image
    const url = URL.createObjectURL(resizedBlob)
    const img = document.createElement('img')
    img.src = url
    document.body.appendChild(img)
  }
}, 'image/png')
```

### Binary Data Streaming

```ts
// Route definition
export const streamBinaryData = defineRoute({
  method: 'POST',
  path: '/api/data/stream',
  handler: async (pathParams: {}, searchParams: {}, body: Blob) => {
    const stream = body.stream()
    const reader = stream.getReader()
    
    let totalProcessed = 0
    const results = []
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const processed = await processChunk(value)
      results.push(processed)
      totalProcessed += value.length
    }
    
    return {
      totalProcessed,
      chunks: results.length,
      results
    }
  }
})

// Client usage with large binary data
const largeBinaryData = new Uint8Array(10 * 1024 * 1024) // 10MB
const blob = new Blob([largeBinaryData], { type: 'application/octet-stream' })

const result = await client.streamBinaryData({ body: blob })
console.log('Processed:', result.totalProcessed, 'bytes in', result.chunks, 'chunks')
```

## Compatibility Notes

### Client Compatibility
- **Modern Browsers:** Full Blob support in all modern browsers
- **Node.js:** Blob support in Node.js 18+ (native) or with polyfills
- **React Native:** Blob support with appropriate polyfills
- **Electron:** Full support in Electron applications

### Backward Compatibility
- **Breaking Change:** Existing `Uint8Array` routes must be updated
- **Client Input:** Clients can still pass `Uint8Array`, `ArrayBuffer` to Blob routes
- **Type Safety:** TypeScript will catch incompatible usage at compile time
- **Runtime:** Runtime errors for incompatible body types

### Migration Timeline
- **Immediate:** Update route definitions to use `Blob`
- **Client Code:** Update client code to create `Blob` instances
- **Testing:** Verify binary data handling works correctly
- **Deployment:** Deploy server and client changes together

## Performance Considerations

### Memory Usage
- **Blob Efficiency:** Blobs are more memory-efficient for large binary data
- **Streaming:** Built-in streaming reduces memory pressure
- **Garbage Collection:** Better garbage collection for blob data
- **Copy Reduction:** Fewer data copies in the processing pipeline

### Network Performance
- **Content-Type:** Automatic content-type handling reduces overhead
- **Compression:** Better HTTP compression support for blob data
- **Caching:** Improved caching behavior with proper MIME types
- **Transfer:** More efficient transfer of binary data

## Troubleshooting

### Common Migration Issues

**Issue:** TypeScript errors about `Uint8Array` not assignable to `Blob`
```ts
// Problem
const data: Uint8Array = new Uint8Array([1, 2, 3])
await client.uploadData({ body: data }) // Type error

// Solution
const data: Uint8Array = new Uint8Array([1, 2, 3])
const blob = new Blob([data], { type: 'application/octet-stream' })
await client.uploadData({ body: blob })
```

**Issue:** Server-side processing of blob data
```ts
// Problem: Trying to use Uint8Array methods on Blob
handler: async (pathParams, searchParams, body: Blob) => {
  const firstByte = body[0] // Error: Blob is not array-like
}

// Solution: Convert to ArrayBuffer/Uint8Array first
handler: async (pathParams, searchParams, body: Blob) => {
  const arrayBuffer = await body.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  const firstByte = uint8Array[0]
}
```

**Issue:** Content-Type not being set correctly
```ts
// Problem: Missing content-type
const blob = new Blob([binaryData]) // No type specified

// Solution: Always specify content-type
const blob = new Blob([binaryData], { type: 'application/octet-stream' })
```

## Future Considerations

### Planned Enhancements
- **Streaming Routes:** Enhanced streaming support for large blobs
- **Content Validation:** Built-in content-type validation
- **Compression:** Automatic compression for blob data
- **Progress Tracking:** Upload/download progress for blob operations

### Potential Improvements
- **Multiple Body Types:** Support for multiple body type unions
- **Custom Blob Types:** Support for custom blob-like objects
- **Validation Schemas:** Schema validation for blob content
- **Transformation Pipelines:** Built-in blob transformation utilities

## References

**External Documentation:**
- [Blob - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [File API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_API)
- [Streams API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)

**Related Changes:**
- [Client Uint8Array Body Support](./2025-07-14_94949a7_client-uint8array-body-support.md) (Previous)
- [FormData Body Support](./2025-07-15_a4000ca_formdata-body-support.md) (Next)
- [ArrayBuffer Body Support](./2025-07-15_230e42a_arraybuffer-body-support.md) (Next)

**Files Modified:**
- `packages/client/src/client.ts` - Enhanced blob handling
- `packages/client/src/protocols/http.ts` - Blob detection instead of Uint8Array
- `packages/client/src/types.ts` - Type system changes for Blob support
- `packages/generator/src/typebox-codegen/index.ts` - TypeBox blob type generation
- `packages/service/src/compileRoute.ts` - Server-side blob request parsing

This breaking change modernizes binary data handling by adopting web standards while providing better developer experience and performance characteristics.

## Open Questions

No unanswered questions