# ArrayBuffer Body Type Support

**Commit:** 230e42a7bfa328b8ac0b8e4981668390f51c514e  
**Author:** Alec Larson  
**Date:** Tue Jul 15 20:25:21 2025 -0400  
**Short SHA:** 230e42a

## Summary

This is an **additive enhancement** that adds support for `ArrayBuffer` as a request body type in alien-rpc. Routes can now accept `ArrayBuffer` objects, enabling efficient handling of raw binary data, typed arrays, and low-level binary operations without breaking existing functionality.

## User Impact

**Audience:** Developers working with binary data, WebAssembly, typed arrays, and low-level data processing  
**Breaking Change:** No - purely additive enhancement  
**Migration Required:** No - existing code continues to work  
**Status:** Enhancement - new functionality available

## Key Changes

### Added
- `ArrayBuffer` as a supported request body type alongside `Blob` and `FormData`
- Client-side ArrayBuffer detection in HTTP protocol handler
- Type system support for ArrayBuffer in route function signatures
- TypeBox code generation support for `ArrayBuffer` types

### Enhanced
- Route type inference now includes ArrayBuffer in body type unions
- HTTP protocol handler detects ArrayBuffer instances for direct transmission
- Complete binary data type coverage (ArrayBuffer, Blob, FormData, Uint8Array)

## Implementation Details

### Client-Side Changes

**HTTP Protocol Handler (`packages/client/src/protocols/http.ts`):**
```ts
// ArrayBuffer detection added to existing body type checks
if (
  params.body instanceof Blob ||
  params.body instanceof FormData ||
  params.body instanceof ArrayBuffer  // New addition
) {
  request.body = params.body
}
```

**Type System (`packages/client/src/types.ts`):**
```ts
// ArrayBuffer included in body type union
type RouteFunction<TRoute, TErrorMode extends ErrorMode> =
  TRoute extends Route<
    (pathParams: any, searchParams: any, body: infer TBody) => any
  >
    ? TBody extends ArrayBuffer | Blob | FormData  // ArrayBuffer added
      ? { body: TBody }
      : TBody
```

**TypeBox Code Generation (`packages/generator/src/typebox-codegen/index.ts`):**
```ts
// ArrayBuffer represented as Any type in TypeBox
if (
  name === 'ArrayBuffer' ||  // New addition
  name === 'Blob' ||
  name === 'FormData' ||
  name === 'Function'
) {
  yield `Type.Any()`
}
```

## Usage Examples

### Binary Data Processing

```ts
// Route definition
export const processBinaryData = defineRoute({
  method: 'POST',
  path: '/api/data/process',
  handler: async (pathParams: {}, searchParams: {}, body: ArrayBuffer) => {
    // Convert to typed array for processing
    const uint8Array = new Uint8Array(body)
    const dataView = new DataView(body)
    
    // Read binary data with specific endianness
    const header = {
      magic: dataView.getUint32(0, true), // little-endian
      version: dataView.getUint16(4, true),
      flags: dataView.getUint16(6, true),
      dataLength: dataView.getUint32(8, true)
    }
    
    // Validate header
    if (header.magic !== 0x12345678) {
      throw new Error('Invalid file format')
    }
    
    // Process data payload
    const payload = uint8Array.slice(12, 12 + header.dataLength)
    const processedData = await processPayload(payload)
    
    return {
      success: true,
      header,
      originalSize: body.byteLength,
      processedSize: processedData.length,
      checksum: calculateChecksum(processedData)
    }
  }
})

// Client usage
const binaryData = new ArrayBuffer(1024)
const view = new DataView(binaryData)

// Write binary header
view.setUint32(0, 0x12345678, true) // magic number
view.setUint16(4, 1, true)          // version
view.setUint16(6, 0, true)          // flags
view.setUint32(8, 1012, true)       // data length

// Write payload data
const payload = new Uint8Array(binaryData, 12)
payload.fill(42) // Fill with sample data

const result = await client.processBinaryData({ body: binaryData })
console.log('Processed binary data:', result.checksum)
```

### WebAssembly Module Upload

```ts
// Route definition
export const uploadWasmModule = defineRoute({
  method: 'POST',
  path: '/api/wasm/upload',
  handler: async (pathParams: {}, searchParams: { name: string }, body: ArrayBuffer) => {
    // Validate WebAssembly module
    const wasmMagic = new Uint8Array(body.slice(0, 4))
    const expectedMagic = new Uint8Array([0x00, 0x61, 0x73, 0x6d]) // "\0asm"
    
    if (!wasmMagic.every((byte, index) => byte === expectedMagic[index])) {
      throw new Error('Invalid WebAssembly module')
    }
    
    // Get WebAssembly version
    const versionBytes = new Uint8Array(body.slice(4, 8))
    const version = new DataView(body.slice(4, 8)).getUint32(0, true)
    
    // Store module
    const moduleId = generateId()
    const storagePath = await storeWasmModule(moduleId, body)
    
    // Validate module can be instantiated
    try {
      const module = await WebAssembly.compile(body)
      const imports = WebAssembly.Module.imports(module)
      const exports = WebAssembly.Module.exports(module)
      
      return {
        success: true,
        moduleId,
        name: searchParams.name,
        size: body.byteLength,
        version,
        storagePath,
        imports: imports.map(imp => ({ module: imp.module, name: imp.name, kind: imp.kind })),
        exports: exports.map(exp => ({ name: exp.name, kind: exp.kind }))
      }
    } catch (error) {
      throw new Error(`Invalid WebAssembly module: ${error.message}`)
    }
  }
})

// Client usage
const wasmFile = await fetch('/path/to/module.wasm')
const wasmArrayBuffer = await wasmFile.arrayBuffer()

const result = await client.uploadWasmModule(
  { name: 'math-utils' },
  { body: wasmArrayBuffer }
)

console.log('WASM module uploaded:', result.moduleId)
console.log('Exports:', result.exports)
```

### Cryptographic Operations

```ts
// Route definition
export const signData = defineRoute({
  method: 'POST',
  path: '/api/crypto/sign',
  handler: async (
    pathParams: {},
    searchParams: { algorithm: 'RSA-PSS' | 'ECDSA' },
    body: ArrayBuffer
  ) => {
    // Import private key (in production, use secure key storage)
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      await getPrivateKeyBuffer(),
      {
        name: searchParams.algorithm,
        hash: 'SHA-256'
      },
      false,
      ['sign']
    )
    
    // Sign the data
    const signature = await crypto.subtle.sign(
      {
        name: searchParams.algorithm,
        saltLength: 32 // for RSA-PSS
      },
      privateKey,
      body
    )
    
    // Calculate hash for verification
    const hash = await crypto.subtle.digest('SHA-256', body)
    
    return {
      success: true,
      algorithm: searchParams.algorithm,
      dataSize: body.byteLength,
      signature: Array.from(new Uint8Array(signature)),
      hash: Array.from(new Uint8Array(hash))
    }
  }
})

// Client usage
const textEncoder = new TextEncoder()
const dataToSign = textEncoder.encode('Important message to sign')
const arrayBuffer = dataToSign.buffer.slice(
  dataToSign.byteOffset,
  dataToSign.byteOffset + dataToSign.byteLength
)

const result = await client.signData(
  { algorithm: 'RSA-PSS' },
  { body: arrayBuffer }
)

console.log('Data signed with', result.algorithm)
console.log('Signature length:', result.signature.length)
```

### Image Processing with Raw Pixel Data

```ts
// Route definition
export const processImagePixels = defineRoute({
  method: 'POST',
  path: '/api/image/pixels',
  handler: async (
    pathParams: {},
    searchParams: { width: number; height: number; format: 'RGBA' | 'RGB' },
    body: ArrayBuffer
  ) => {
    const { width, height, format } = searchParams
    const bytesPerPixel = format === 'RGBA' ? 4 : 3
    const expectedSize = width * height * bytesPerPixel
    
    if (body.byteLength !== expectedSize) {
      throw new Error(`Expected ${expectedSize} bytes, got ${body.byteLength}`)
    }
    
    const pixels = new Uint8Array(body)
    const processedPixels = new Uint8Array(body.byteLength)
    
    // Apply image processing (example: invert colors)
    for (let i = 0; i < pixels.length; i += bytesPerPixel) {
      processedPixels[i] = 255 - pixels[i]     // Red
      processedPixels[i + 1] = 255 - pixels[i + 1] // Green
      processedPixels[i + 2] = 255 - pixels[i + 2] // Blue
      
      if (format === 'RGBA') {
        processedPixels[i + 3] = pixels[i + 3] // Alpha (unchanged)
      }
    }
    
    // Calculate statistics
    const stats = calculateImageStats(pixels, bytesPerPixel)
    
    return {
      success: true,
      originalSize: body.byteLength,
      processedData: Array.from(processedPixels),
      dimensions: { width, height },
      format,
      stats
    }
  }
})

// Client usage with Canvas
const canvas = document.getElementById('canvas') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

// Convert ImageData to ArrayBuffer
const arrayBuffer = imageData.data.buffer.slice(
  imageData.data.byteOffset,
  imageData.data.byteOffset + imageData.data.byteLength
)

const result = await client.processImagePixels(
  {
    width: canvas.width,
    height: canvas.height,
    format: 'RGBA'
  },
  { body: arrayBuffer }
)

// Apply processed data back to canvas
const processedImageData = new ImageData(
  new Uint8ClampedArray(result.processedData),
  canvas.width,
  canvas.height
)
ctx.putImageData(processedImageData, 0, 0)
```

### Audio Data Processing

```ts
// Route definition
export const processAudioBuffer = defineRoute({
  method: 'POST',
  path: '/api/audio/process',
  handler: async (
    pathParams: {},
    searchParams: {
      sampleRate: number
      channels: number
      format: 'float32' | 'int16'
    },
    body: ArrayBuffer
  ) => {
    const { sampleRate, channels, format } = searchParams
    
    let audioData: Float32Array | Int16Array
    
    if (format === 'float32') {
      audioData = new Float32Array(body)
    } else {
      audioData = new Int16Array(body)
    }
    
    const samplesPerChannel = audioData.length / channels
    const durationSeconds = samplesPerChannel / sampleRate
    
    // Apply audio processing (example: normalize)
    const processedData = new Float32Array(audioData.length)
    let maxAmplitude = 0
    
    // Find maximum amplitude
    for (let i = 0; i < audioData.length; i++) {
      const amplitude = Math.abs(audioData[i])
      if (amplitude > maxAmplitude) {
        maxAmplitude = amplitude
      }
    }
    
    // Normalize audio
    const normalizationFactor = maxAmplitude > 0 ? 1.0 / maxAmplitude : 1.0
    for (let i = 0; i < audioData.length; i++) {
      processedData[i] = audioData[i] * normalizationFactor
    }
    
    // Calculate audio statistics
    const stats = {
      duration: durationSeconds,
      samples: audioData.length,
      samplesPerChannel,
      maxAmplitude,
      rmsLevel: calculateRMS(audioData)
    }
    
    return {
      success: true,
      originalSize: body.byteLength,
      processedData: Array.from(processedData),
      sampleRate,
      channels,
      format,
      stats
    }
  }
})

// Client usage with Web Audio API
const audioContext = new AudioContext()
const audioBuffer = await audioContext.decodeAudioData(audioFileArrayBuffer)

// Get channel data as Float32Array
const channelData = audioBuffer.getChannelData(0)
const arrayBuffer = channelData.buffer.slice(
  channelData.byteOffset,
  channelData.byteOffset + channelData.byteLength
)

const result = await client.processAudioBuffer(
  {
    sampleRate: audioBuffer.sampleRate,
    channels: 1,
    format: 'float32'
  },
  { body: arrayBuffer }
)

console.log('Audio processed:', result.stats)
```

## ArrayBuffer Utilities

### Conversion Helpers

```ts
// Utility functions for ArrayBuffer operations
export class ArrayBufferUtils {
  // Convert string to ArrayBuffer
  static fromString(str: string, encoding: 'utf8' | 'utf16' = 'utf8'): ArrayBuffer {
    if (encoding === 'utf8') {
      const encoder = new TextEncoder()
      return encoder.encode(str).buffer
    } else {
      const buffer = new ArrayBuffer(str.length * 2)
      const view = new Uint16Array(buffer)
      for (let i = 0; i < str.length; i++) {
        view[i] = str.charCodeAt(i)
      }
      return buffer
    }
  }
  
  // Convert ArrayBuffer to string
  static toString(buffer: ArrayBuffer, encoding: 'utf8' | 'utf16' = 'utf8'): string {
    if (encoding === 'utf8') {
      const decoder = new TextDecoder()
      return decoder.decode(buffer)
    } else {
      const view = new Uint16Array(buffer)
      return String.fromCharCode(...view)
    }
  }
  
  // Convert typed array to ArrayBuffer
  static fromTypedArray(typedArray: TypedArray): ArrayBuffer {
    return typedArray.buffer.slice(
      typedArray.byteOffset,
      typedArray.byteOffset + typedArray.byteLength
    )
  }
  
  // Concatenate multiple ArrayBuffers
  static concat(...buffers: ArrayBuffer[]): ArrayBuffer {
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0)
    const result = new ArrayBuffer(totalLength)
    const resultView = new Uint8Array(result)
    
    let offset = 0
    for (const buffer of buffers) {
      const view = new Uint8Array(buffer)
      resultView.set(view, offset)
      offset += buffer.byteLength
    }
    
    return result
  }
  
  // Compare two ArrayBuffers
  static equals(buffer1: ArrayBuffer, buffer2: ArrayBuffer): boolean {
    if (buffer1.byteLength !== buffer2.byteLength) {
      return false
    }
    
    const view1 = new Uint8Array(buffer1)
    const view2 = new Uint8Array(buffer2)
    
    for (let i = 0; i < view1.length; i++) {
      if (view1[i] !== view2[i]) {
        return false
      }
    }
    
    return true
  }
  
  // Create ArrayBuffer from hex string
  static fromHex(hex: string): ArrayBuffer {
    const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '')
    const buffer = new ArrayBuffer(cleanHex.length / 2)
    const view = new Uint8Array(buffer)
    
    for (let i = 0; i < cleanHex.length; i += 2) {
      view[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
    }
    
    return buffer
  }
  
  // Convert ArrayBuffer to hex string
  static toHex(buffer: ArrayBuffer): string {
    const view = new Uint8Array(buffer)
    return Array.from(view)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
  }
}

// Usage examples
const textBuffer = ArrayBufferUtils.fromString('Hello, World!')
const hexBuffer = ArrayBufferUtils.fromHex('48656c6c6f2c20576f726c6421')
const isEqual = ArrayBufferUtils.equals(textBuffer, hexBuffer) // true

const result = await client.processBinaryData({ body: textBuffer })
```

### Binary Data Validation

```ts
// Validation utilities for ArrayBuffer data
export class BinaryValidator {
  // Validate file signature/magic bytes
  static validateFileSignature(buffer: ArrayBuffer, signatures: { [key: string]: number[] }): string | null {
    const view = new Uint8Array(buffer)
    
    for (const [fileType, signature] of Object.entries(signatures)) {
      if (view.length >= signature.length) {
        const matches = signature.every((byte, index) => view[index] === byte)
        if (matches) {
          return fileType
        }
      }
    }
    
    return null
  }
  
  // Validate data integrity with checksum
  static async validateChecksum(buffer: ArrayBuffer, expectedChecksum: string, algorithm: 'SHA-256' | 'SHA-1' = 'SHA-256'): Promise<boolean> {
    const hashBuffer = await crypto.subtle.digest(algorithm, buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    return hashHex === expectedChecksum.toLowerCase()
  }
  
  // Validate buffer size constraints
  static validateSize(buffer: ArrayBuffer, constraints: {
    minSize?: number
    maxSize?: number
    exactSize?: number
    multipleOf?: number
  }): { valid: boolean; error?: string } {
    const size = buffer.byteLength
    
    if (constraints.exactSize !== undefined && size !== constraints.exactSize) {
      return { valid: false, error: `Expected exactly ${constraints.exactSize} bytes, got ${size}` }
    }
    
    if (constraints.minSize !== undefined && size < constraints.minSize) {
      return { valid: false, error: `Minimum size is ${constraints.minSize} bytes, got ${size}` }
    }
    
    if (constraints.maxSize !== undefined && size > constraints.maxSize) {
      return { valid: false, error: `Maximum size is ${constraints.maxSize} bytes, got ${size}` }
    }
    
    if (constraints.multipleOf !== undefined && size % constraints.multipleOf !== 0) {
      return { valid: false, error: `Size must be multiple of ${constraints.multipleOf}, got ${size}` }
    }
    
    return { valid: true }
  }
}

// Usage in route handler
export const validateBinaryUpload = defineRoute({
  method: 'POST',
  path: '/api/binary/validate',
  handler: async (pathParams: {}, searchParams: {}, body: ArrayBuffer) => {
    // Validate file signatures
    const fileType = BinaryValidator.validateFileSignature(body, {
      'PNG': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
      'JPEG': [0xFF, 0xD8, 0xFF],
      'PDF': [0x25, 0x50, 0x44, 0x46],
      'WASM': [0x00, 0x61, 0x73, 0x6D]
    })
    
    if (!fileType) {
      throw new Error('Unsupported file type')
    }
    
    // Validate size constraints
    const sizeValidation = BinaryValidator.validateSize(body, {
      minSize: 1024,      // 1KB minimum
      maxSize: 10485760,  // 10MB maximum
      multipleOf: 4       // Must be multiple of 4 bytes
    })
    
    if (!sizeValidation.valid) {
      throw new Error(sizeValidation.error)
    }
    
    return {
      success: true,
      fileType,
      size: body.byteLength,
      validation: 'passed'
    }
  }
})
```

## Performance Considerations

### Memory Efficiency
- **Zero-Copy:** ArrayBuffer enables zero-copy operations where possible
- **Memory Mapping:** Efficient memory usage for large binary data
- **Garbage Collection:** Proper cleanup of ArrayBuffer objects
- **Shared Memory:** Potential for SharedArrayBuffer in worker contexts

### Network Performance
- **Binary Transfer:** Direct binary transfer without encoding overhead
- **Compression:** HTTP compression works efficiently with binary data
- **Streaming:** Can be combined with streaming for large datasets
- **Chunking:** Supports chunked transfer encoding

### Processing Performance
- **Typed Arrays:** Direct access via typed array views
- **SIMD Operations:** Potential for SIMD optimizations
- **WebAssembly:** Efficient data exchange with WebAssembly modules
- **Worker Threads:** Transferable objects for worker communication

## Browser and Platform Support

### Browser Compatibility
- **Modern Browsers:** Full ArrayBuffer support in all modern browsers
- **Internet Explorer:** ArrayBuffer supported in IE 10+
- **Mobile Browsers:** Full support in iOS Safari and Android Chrome
- **WebView:** Supported in all modern WebView implementations

### Node.js Compatibility
- **Node.js 4+:** Native ArrayBuffer support
- **Buffer Integration:** Seamless integration with Node.js Buffer
- **Performance:** Optimized for server-side binary processing
- **Memory Management:** Efficient memory handling in Node.js

### Platform Features
- **Web Workers:** Transferable ArrayBuffer objects
- **WebAssembly:** Direct memory sharing with WASM modules
- **Crypto API:** Native support in Web Crypto API
- **File API:** Integration with File and Blob APIs

## Security Considerations

### Memory Safety
```ts
// Safe ArrayBuffer handling
export const secureArrayBufferHandler = defineRoute({
  method: 'POST',
  path: '/api/secure/buffer',
  handler: async (pathParams: {}, searchParams: {}, body: ArrayBuffer) => {
    // Validate buffer size to prevent memory exhaustion
    if (body.byteLength > 100 * 1024 * 1024) { // 100MB limit
      throw new Error('Buffer too large')
    }
    
    // Create defensive copy if needed
    const safeCopy = body.slice(0)
    
    // Validate buffer contents
    const view = new Uint8Array(safeCopy)
    if (containsMaliciousPattern(view)) {
      throw new Error('Malicious content detected')
    }
    
    // Process safely
    return await processSecureBuffer(safeCopy)
  }
})
```

### Input Validation
```ts
// Comprehensive input validation
function validateBinaryInput(buffer: ArrayBuffer): void {
  // Size validation
  if (buffer.byteLength === 0) {
    throw new Error('Empty buffer not allowed')
  }
  
  if (buffer.byteLength > 50 * 1024 * 1024) {
    throw new Error('Buffer exceeds maximum size')
  }
  
  // Content validation
  const view = new Uint8Array(buffer)
  
  // Check for null bytes in text data
  if (hasNullBytes(view)) {
    throw new Error('Null bytes detected in text data')
  }
  
  // Validate against known malicious patterns
  if (containsShellcode(view)) {
    throw new Error('Potential shellcode detected')
  }
}
```

## Troubleshooting

### Common Issues

**Issue:** ArrayBuffer not being transmitted correctly
```ts
// Problem: Trying to JSON.stringify ArrayBuffer
const data = JSON.stringify(arrayBuffer) // This doesn't work

// Solution: Use ArrayBuffer directly as body
const result = await client.processData({ body: arrayBuffer })
```

**Issue:** TypedArray vs ArrayBuffer confusion
```ts
// Problem: Passing TypedArray instead of ArrayBuffer
const uint8Array = new Uint8Array([1, 2, 3, 4])
await client.processData({ body: uint8Array }) // Type error

// Solution: Extract ArrayBuffer from TypedArray
const arrayBuffer = uint8Array.buffer.slice(
  uint8Array.byteOffset,
  uint8Array.byteOffset + uint8Array.byteLength
)
await client.processData({ body: arrayBuffer })
```

**Issue:** Memory leaks with large ArrayBuffers
```ts
// Problem: Not releasing references
let largeBuffer = new ArrayBuffer(100 * 1024 * 1024)
// ... use buffer ...
// Buffer remains in memory

// Solution: Explicitly release references
let largeBuffer = new ArrayBuffer(100 * 1024 * 1024)
// ... use buffer ...
largeBuffer = null // Allow garbage collection
```

## Future Enhancements

### Planned Features
- **SharedArrayBuffer:** Support for shared memory scenarios
- **Streaming ArrayBuffer:** Chunked processing of large buffers
- **Compression:** Automatic compression for ArrayBuffer data
- **Validation Schemas:** Built-in binary data validation

### Potential Improvements
- **Memory Pools:** Reusable ArrayBuffer pools for performance
- **SIMD Support:** Optimized SIMD operations on binary data
- **WebAssembly Integration:** Enhanced WASM memory sharing
- **Custom Serialization:** Pluggable binary serialization formats

## References

**External Documentation:**
- [ArrayBuffer - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)
- [TypedArray - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray)
- [DataView - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView)
- [WebAssembly Memory - MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/Memory)

**Related Changes:**
- [FormData Body Support](./2025-07-15_a4000ca_formdata-body-support.md) (Previous)
- [Merge ArrayBuffer Support into Blob Support](./2025-07-15_de41775_merge-arraybuffer-into-blob-support.md) (Next)

**Files Modified:**
- `packages/client/src/protocols/http.ts` - ArrayBuffer detection in HTTP protocol
- `packages/client/src/types.ts` - Type system support for ArrayBuffer
- `packages/generator/src/typebox-codegen/index.ts` - TypeBox generation for ArrayBuffer

This enhancement provides comprehensive binary data handling capabilities for low-level operations, WebAssembly integration, and high-performance binary processing scenarios.

## Open Questions

No unanswered questions