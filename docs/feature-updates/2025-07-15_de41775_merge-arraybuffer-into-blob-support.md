# Merge ArrayBuffer Support into Blob Support

**Commit:** de41775d777d8cce795aa3c25d5b05a2440680b0  
**Author:** Alec Larson  
**Date:** Tue Jul 15 21:44:25 2025 -0400  
**Short SHA:** de41775

## Summary

This is a **breaking change** that consolidates binary data handling by merging ArrayBuffer support into Blob support. Routes should now always use `Blob` as their body type, while clients can pass `Blob`, `ArrayBuffer`, or `Uint8Array`. This simplifies the type system while maintaining client flexibility and improving developer experience.

## User Impact

**Audience:** Developers using binary data types in route definitions  
**Breaking Change:** Yes - route definitions must use `Blob` instead of `ArrayBuffer`  
**Migration Required:** Yes - update route handlers to use `Blob`  
**Status:** Breaking - requires code changes for ArrayBuffer routes

## Key Changes

### Removed
- `ArrayBuffer` as a distinct route body type
- `Uint8Array` TypeBox generation support
- Separate type handling for `ArrayBuffer` in route functions

### Added
- `Uint8Array` client-side support alongside `ArrayBuffer` and `Blob`
- Unified `Blob` body type for all binary data in routes
- Enhanced client flexibility with multiple binary input types

### Changed
- Route type inference now maps all binary types to `Blob`
- Client can pass `Blob`, `ArrayBuffer`, or `Uint8Array` for `Blob` routes
- TypeBox code generation simplified by removing `ArrayBuffer` handling

## Breaking Changes

### Route Definition Changes

**Before:**
```ts
// Separate route types for different binary data
export const processArrayBuffer = defineRoute({
  method: 'POST',
  path: '/api/process/arraybuffer',
  handler: async (pathParams: {}, searchParams: {}, body: ArrayBuffer) => {
    const view = new DataView(body)
    const value = view.getUint32(0, true)
    return { value, size: body.byteLength }
  }
})

export const processBlob = defineRoute({
  method: 'POST',
  path: '/api/process/blob',
  handler: async (pathParams: {}, searchParams: {}, body: Blob) => {
    const arrayBuffer = await body.arrayBuffer()
    const view = new DataView(arrayBuffer)
    const value = view.getUint32(0, true)
    return { value, size: body.size, type: body.type }
  }
})
```

**After:**
```ts
// Unified Blob route type for all binary data
export const processBinaryData = defineRoute({
  method: 'POST',
  path: '/api/process/binary',
  handler: async (pathParams: {}, searchParams: {}, body: Blob) => {
    // Handle all binary data as Blob
    const arrayBuffer = await body.arrayBuffer()
    const view = new DataView(arrayBuffer)
    const value = view.getUint32(0, true)
    
    return {
      value,
      size: body.size,
      type: body.type || 'application/octet-stream'
    }
  }
})
```

### Client Usage Flexibility

**Before:**
```ts
// Different routes for different binary types
const arrayBuffer = new ArrayBuffer(8)
const view = new DataView(arrayBuffer)
view.setUint32(0, 42, true)

// Had to use specific route for ArrayBuffer
const result1 = await client.processArrayBuffer({ body: arrayBuffer })

// Had to convert to Blob for Blob route
const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
const result2 = await client.processBlob({ body: blob })
```

**After:**
```ts
// Single route accepts multiple client input types
const arrayBuffer = new ArrayBuffer(8)
const view = new DataView(arrayBuffer)
view.setUint32(0, 42, true)

// All of these work with the same Blob route:

// 1. Direct ArrayBuffer (auto-converted to Blob)
const result1 = await client.processBinaryData({ body: arrayBuffer })

// 2. Explicit Blob with content type
const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
const result2 = await client.processBinaryData({ body: blob })

// 3. Uint8Array (auto-converted to Blob)
const uint8Array = new Uint8Array(arrayBuffer)
const result3 = await client.processBinaryData({ body: uint8Array })
```

### Type System Changes

**Before:**
```ts
// Separate type handling for each binary type
type RouteFunction<TRoute, TErrorMode extends ErrorMode> =
  TRoute extends Route<
    (pathParams: any, searchParams: any, body: infer TBody) => any
  >
    ? TBody extends ArrayBuffer | Blob | FormData
      ? { body: TBody }  // Exact type match required
      : TBody
```

**After:**
```ts
// Unified type handling with client flexibility
type RouteFunction<TRoute, TErrorMode extends ErrorMode> =
  TRoute extends Route<
    (pathParams: any, searchParams: any, body: infer TBody) => any
  >
    ? TBody extends FormData
      ? { body: FormData }
      : TBody extends Blob
        ? { body: Blob | ArrayBuffer | Uint8Array }  // Client flexibility
        : TBody
```

## Migration Guide

### Step 1: Update Route Definitions

```ts
// Before: ArrayBuffer route
export const processRawData = defineRoute({
  method: 'POST',
  path: '/api/data/raw',
  handler: async (pathParams: {}, searchParams: {}, body: ArrayBuffer) => {
    const bytes = new Uint8Array(body)
    const checksum = calculateChecksum(bytes)
    return { size: body.byteLength, checksum }
  }
})

// After: Blob route with ArrayBuffer conversion
export const processRawData = defineRoute({
  method: 'POST',
  path: '/api/data/raw',
  handler: async (pathParams: {}, searchParams: {}, body: Blob) => {
    // Convert Blob to ArrayBuffer for processing
    const arrayBuffer = await body.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const checksum = calculateChecksum(bytes)
    
    return {
      size: body.size,
      type: body.type,
      checksum
    }
  }
})
```

### Step 2: Update Binary Processing Logic

```ts
// Before: Direct ArrayBuffer processing
function processArrayBuffer(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  return {
    header: view.getUint32(0, true),
    data: new Uint8Array(buffer, 4)
  }
}

// After: Blob processing with async conversion
async function processBlob(blob: Blob) {
  const buffer = await blob.arrayBuffer()
  const view = new DataView(buffer)
  return {
    header: view.getUint32(0, true),
    data: new Uint8Array(buffer, 4),
    contentType: blob.type,
    size: blob.size
  }
}
```

### Step 3: Update Client Code (Optional)

```ts
// Before: Specific type handling
const arrayBuffer = new ArrayBuffer(1024)
// ... populate buffer ...

// Had to ensure exact type match
const result = await client.processRawData({ body: arrayBuffer })

// After: Flexible client input (no changes required)
const arrayBuffer = new ArrayBuffer(1024)
// ... populate buffer ...

// Same call works, but now more flexible
const result = await client.processRawData({ body: arrayBuffer })

// Can also use Uint8Array or Blob
const uint8Array = new Uint8Array(arrayBuffer)
const result2 = await client.processRawData({ body: uint8Array })

const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
const result3 = await client.processRawData({ body: blob })
```

### Step 4: Handle Content-Type Headers

```ts
// Before: Content-Type was implicit
const binaryData = new ArrayBuffer(512)
const result = await client.uploadBinary({ body: binaryData })

// After: Consider setting Content-Type for non-Blob inputs
const binaryData = new ArrayBuffer(512)

// Option 1: Use Blob with explicit content type
const blob = new Blob([binaryData], { type: 'application/octet-stream' })
const result1 = await client.uploadBinary({ body: blob })

// Option 2: Set Content-Type header manually
const result2 = await client.uploadBinary(
  { body: binaryData },
  { headers: { 'Content-Type': 'application/octet-stream' } }
)
```

## Implementation Details

### Client-Side Changes

**HTTP Protocol Handler (`packages/client/src/protocols/http.ts`):**
```ts
// Enhanced binary type detection
if (
  params.body instanceof Blob ||
  params.body instanceof FormData ||
  params.body instanceof ArrayBuffer ||
  params.body instanceof Uint8Array  // New addition
) {
  request.body = params.body
}
```

**Type System (`packages/client/src/types.ts`):**
```ts
// Flexible client input for Blob routes
TBody extends FormData
  ? { body: FormData }
  : TBody extends Blob
    ? { body: Blob | ArrayBuffer | Uint8Array }  // Multiple input types
    : TBody
```

**TypeBox Code Generation (`packages/generator/src/typebox-codegen/index.ts`):**
```ts
// Simplified - removed ArrayBuffer and Uint8Array handling
if (
  name === 'Blob' ||
  name === 'FormData' ||
  name === 'Function'
) {
  yield `Type.Any()`
}
// ArrayBuffer and Uint8Array generation removed
```

## Advantages of Unified Blob Approach

### Simplified Type System
- **Single Binary Type:** Routes only need to handle `Blob`
- **Reduced Complexity:** Fewer type combinations to manage
- **Consistent API:** Uniform binary data handling across routes
- **Better Maintainability:** Less code duplication in type definitions

### Enhanced Client Flexibility
- **Multiple Input Types:** Clients can use `Blob`, `ArrayBuffer`, or `Uint8Array`
- **Automatic Conversion:** Framework handles type conversion transparently
- **Backward Compatibility:** Existing client code continues to work
- **Developer Choice:** Use the most convenient type for each scenario

### Improved Developer Experience
- **Consistent Patterns:** All binary routes follow the same pattern
- **Rich Metadata:** Blob provides size and content-type information
- **Streaming Support:** Blob supports streaming for large data
- **Web Standards:** Aligns with web platform standards

## Usage Examples

### Image Processing Route

```ts
// Unified image processing route
export const processImage = defineRoute({
  method: 'POST',
  path: '/api/image/process',
  handler: async (
    pathParams: {},
    searchParams: { operation: 'resize' | 'compress' | 'convert' },
    body: Blob
  ) => {
    // Validate content type
    if (!body.type.startsWith('image/')) {
      throw new Error(`Expected image, got ${body.type}`)
    }
    
    // Convert to ArrayBuffer for processing
    const arrayBuffer = await body.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)
    
    // Process based on operation
    let processedBuffer: Buffer
    switch (searchParams.operation) {
      case 'resize':
        processedBuffer = await resizeImage(imageBuffer)
        break
      case 'compress':
        processedBuffer = await compressImage(imageBuffer)
        break
      case 'convert':
        processedBuffer = await convertImage(imageBuffer, 'webp')
        break
    }
    
    return {
      success: true,
      originalSize: body.size,
      originalType: body.type,
      processedSize: processedBuffer.length,
      operation: searchParams.operation
    }
  }
})

// Client usage with different input types

// 1. From File input (already a Blob/File)
const fileInput = document.getElementById('image') as HTMLInputElement
const file = fileInput.files?.[0]
if (file) {
  const result = await client.processImage(
    { operation: 'resize' },
    { body: file }
  )
}

// 2. From Canvas (ArrayBuffer)
const canvas = document.getElementById('canvas') as HTMLCanvasElement
canvas.toBlob(async (blob) => {
  if (blob) {
    const result = await client.processImage(
      { operation: 'compress' },
      { body: blob }
    )
  }
})

// 3. From raw image data (Uint8Array)
const imageData = new Uint8Array(rawImageBytes)
const result = await client.processImage(
  { operation: 'convert' },
  { body: imageData }
)
```

### WebAssembly Module Handling

```ts
// Unified WASM module route
export const deployWasmModule = defineRoute({
  method: 'POST',
  path: '/api/wasm/deploy',
  handler: async (
    pathParams: {},
    searchParams: { name: string; version: string },
    body: Blob
  ) => {
    // Convert to ArrayBuffer for WASM validation
    const arrayBuffer = await body.arrayBuffer()
    
    // Validate WASM magic bytes
    const magicBytes = new Uint8Array(arrayBuffer.slice(0, 4))
    const expectedMagic = [0x00, 0x61, 0x73, 0x6d]
    
    if (!magicBytes.every((byte, i) => byte === expectedMagic[i])) {
      throw new Error('Invalid WebAssembly module')
    }
    
    // Compile and validate module
    try {
      const module = await WebAssembly.compile(arrayBuffer)
      const exports = WebAssembly.Module.exports(module)
      const imports = WebAssembly.Module.imports(module)
      
      // Store module
      const moduleId = await storeWasmModule({
        name: searchParams.name,
        version: searchParams.version,
        data: arrayBuffer,
        size: body.size,
        contentType: body.type
      })
      
      return {
        success: true,
        moduleId,
        name: searchParams.name,
        version: searchParams.version,
        size: body.size,
        exports: exports.map(exp => ({ name: exp.name, kind: exp.kind })),
        imports: imports.map(imp => ({ module: imp.module, name: imp.name, kind: imp.kind }))
      }
    } catch (error) {
      throw new Error(`WASM compilation failed: ${error.message}`)
    }
  }
})

// Client usage with different sources

// 1. From fetch (ArrayBuffer)
const wasmResponse = await fetch('/modules/math.wasm')
const wasmArrayBuffer = await wasmResponse.arrayBuffer()
const result1 = await client.deployWasmModule(
  { name: 'math-utils', version: '1.0.0' },
  { body: wasmArrayBuffer }
)

// 2. From File input (Blob)
const fileInput = document.getElementById('wasm-file') as HTMLInputElement
const wasmFile = fileInput.files?.[0]
if (wasmFile) {
  const result2 = await client.deployWasmModule(
    { name: 'user-module', version: '1.0.0' },
    { body: wasmFile }
  )
}

// 3. From compiled bytes (Uint8Array)
const compiledWasm = new Uint8Array(wasmBytecode)
const result3 = await client.deployWasmModule(
  { name: 'compiled-module', version: '1.0.0' },
  { body: compiledWasm }
)
```

### Binary Data Analysis

```ts
// Unified binary analysis route
export const analyzeBinaryData = defineRoute({
  method: 'POST',
  path: '/api/analysis/binary',
  handler: async (pathParams: {}, searchParams: {}, body: Blob) => {
    const arrayBuffer = await body.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    
    // Perform various analyses
    const analysis = {
      size: body.size,
      contentType: body.type,
      entropy: calculateEntropy(bytes),
      histogram: calculateByteHistogram(bytes),
      patterns: findBinaryPatterns(bytes),
      fileSignature: detectFileSignature(bytes),
      compression: {
        gzipRatio: await calculateCompressionRatio(bytes, 'gzip'),
        brotliRatio: await calculateCompressionRatio(bytes, 'brotli')
      },
      statistics: {
        mean: bytes.reduce((sum, byte) => sum + byte, 0) / bytes.length,
        min: Math.min(...bytes),
        max: Math.max(...bytes),
        nullBytes: bytes.filter(byte => byte === 0).length
      }
    }
    
    return {
      success: true,
      analysis
    }
  }
})

// Client can use any binary type
const analyses = await Promise.all([
  // ArrayBuffer from crypto operation
  client.analyzeBinaryData({ body: cryptoResult.buffer }),
  
  // Uint8Array from image processing
  client.analyzeBinaryData({ body: processedImageData }),
  
  // Blob from file upload
  client.analyzeBinaryData({ body: uploadedFile })
])
```

## Content-Type Handling

### Automatic Content-Type Detection

```ts
// Server-side content-type handling
export const handleBinaryUpload = defineRoute({
  method: 'POST',
  path: '/api/upload/binary',
  handler: async (pathParams: {}, searchParams: {}, body: Blob) => {
    // Blob provides content-type information
    const contentType = body.type || 'application/octet-stream'
    
    // Handle different content types
    if (contentType.startsWith('image/')) {
      return await processImageBlob(body)
    } else if (contentType === 'application/wasm') {
      return await processWasmBlob(body)
    } else if (contentType.startsWith('audio/')) {
      return await processAudioBlob(body)
    } else {
      return await processGenericBlob(body)
    }
  }
})
```

### Client Content-Type Best Practices

```ts
// Best practices for client content-type handling

// 1. Use Blob with explicit content-type when possible
const imageData = new Uint8Array(rawImageBytes)
const imageBlob = new Blob([imageData], { type: 'image/png' })
await client.handleBinaryUpload({ body: imageBlob })

// 2. Set Content-Type header for ArrayBuffer/Uint8Array
const binaryData = new ArrayBuffer(1024)
await client.handleBinaryUpload(
  { body: binaryData },
  { headers: { 'Content-Type': 'application/octet-stream' } }
)

// 3. Use File objects when available (they include content-type)
const fileInput = document.getElementById('file') as HTMLInputElement
const file = fileInput.files?.[0]
if (file) {
  // File extends Blob and includes correct content-type
  await client.handleBinaryUpload({ body: file })
}
```

## Performance Considerations

### Memory Efficiency
- **Single Conversion:** Client types converted to Blob only when needed
- **Streaming:** Blob supports streaming for large data processing
- **Memory Reuse:** Reduced memory allocation for type conversions
- **Garbage Collection:** Better GC behavior with unified type handling

### Network Performance
- **Direct Transfer:** Binary data transferred without additional encoding
- **Content-Type Optimization:** Proper content-type enables better compression
- **Caching:** Consistent content-type improves HTTP caching
- **Chunked Transfer:** Blob supports chunked transfer encoding

### Processing Performance
- **Async Conversion:** Blob to ArrayBuffer conversion is async and efficient
- **Zero-Copy:** Minimal data copying in the conversion process
- **Streaming Processing:** Can process large blobs in chunks
- **Type Safety:** Compile-time type checking prevents runtime errors

## Compatibility Notes

### Client Compatibility
- **Existing Code:** Most existing client code continues to work
- **Type Flexibility:** Clients can use the most convenient binary type
- **Progressive Enhancement:** Can gradually adopt Blob for better features
- **Framework Agnostic:** Works with any client-side framework

### Server Compatibility
- **Breaking Change:** Server routes must be updated to use Blob
- **Enhanced Features:** Blob provides more metadata than ArrayBuffer
- **Async Processing:** Blob methods are async, requiring await
- **Content-Type Access:** Server can access content-type information

### Migration Timeline
- **Immediate:** Update route definitions to use Blob
- **Optional:** Update client code to use Blob for better features
- **Gradual:** Migrate processing logic to take advantage of Blob features
- **Long-term:** Standardize on Blob for all binary data handling

## Troubleshooting

### Common Migration Issues

**Issue:** Route handler expects ArrayBuffer methods
```ts
// Problem: Trying to use ArrayBuffer methods on Blob
handler: async (pathParams, searchParams, body: Blob) => {
  const view = new DataView(body) // Error: Blob is not ArrayBuffer
}

// Solution: Convert Blob to ArrayBuffer first
handler: async (pathParams, searchParams, body: Blob) => {
  const arrayBuffer = await body.arrayBuffer()
  const view = new DataView(arrayBuffer)
}
```

**Issue:** Synchronous processing with async Blob methods
```ts
// Problem: Forgetting async/await
handler: async (pathParams, searchParams, body: Blob) => {
  const buffer = body.arrayBuffer() // Returns Promise, not ArrayBuffer
  return processBuffer(buffer) // Error: processing Promise instead of ArrayBuffer
}

// Solution: Use await for Blob methods
handler: async (pathParams, searchParams, body: Blob) => {
  const buffer = await body.arrayBuffer()
  return processBuffer(buffer)
}
```

**Issue:** Missing content-type for non-Blob client inputs
```ts
// Problem: ArrayBuffer without content-type
const binaryData = new ArrayBuffer(1024)
const result = await client.uploadBinary({ body: binaryData })
// Server receives Blob with empty type

// Solution: Use Blob with content-type or set header
const blob = new Blob([binaryData], { type: 'application/octet-stream' })
const result = await client.uploadBinary({ body: blob })

// Or set Content-Type header
const result = await client.uploadBinary(
  { body: binaryData },
  { headers: { 'Content-Type': 'application/octet-stream' } }
)
```

## Future Enhancements

### Planned Features
- **Streaming Blob Processing:** Enhanced streaming support for large blobs
- **Content Validation:** Built-in content-type validation
- **Compression:** Automatic compression based on content-type
- **Progress Tracking:** Upload/download progress for blob operations

### Potential Improvements
- **Custom Blob Types:** Support for application-specific blob types
- **Transformation Pipelines:** Built-in blob transformation utilities
- **Caching:** Intelligent caching based on blob characteristics
- **Validation Schemas:** Schema validation for blob content

## References

**External Documentation:**
- [Blob - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [ArrayBuffer - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)
- [Uint8Array - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array)
- [File API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_API)

**Related Changes:**
- [ArrayBuffer Body Support](./2025-07-15_230e42a_arraybuffer-body-support.md) (Previous)
- [Allow Relative prefixUrl](./2025-07-16_c96e973_allow-relative-prefix-url.md) (Next)

**Files Modified:**
- `packages/client/src/protocols/http.ts` - Added Uint8Array support, maintained ArrayBuffer
- `packages/client/src/types.ts` - Unified Blob type with client input flexibility
- `packages/generator/src/typebox-codegen/index.ts` - Removed ArrayBuffer and Uint8Array generation

This breaking change simplifies the binary data handling model while providing enhanced client flexibility and better alignment with web standards.

## Open Questions

No unanswered questions