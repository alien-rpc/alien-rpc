# Client Support for Uint8Array Request Body

**Commit:** 94949a71f60ed65c35ecda16aa4d1bf782162d58  
**Author:** Alec Larson  
**Date:** Mon Jul 14 14:14:18 2025 -0400  
**Short SHA:** 94949a7

## Summary

Additive enhancement that adds **Uint8Array support** as a request body type in alien-rpc client routes. Routes can now accept binary data as Uint8Array instances, enabling efficient handling of raw binary content without base64 encoding overhead.

## User-Visible Changes

- **Added**: Support for `Uint8Array` as a request body type in route definitions
- **Added**: Automatic detection and handling of Uint8Array instances in HTTP requests
- **Added**: Type safety for routes that expect Uint8Array bodies
- **Enhanced**: Route function type inference now includes Uint8Array body support
- **Enhanced**: HTTP protocol handler recognizes and processes Uint8Array bodies

## Examples

### Route Definition with Uint8Array Body
```ts
import { defineRoute } from '@alien-rpc/service'

export const uploadBinary = defineRoute({
  method: 'POST',
  path: '/api/upload/binary',
  handler: async (pathParams: {}, searchParams: {}, body: Uint8Array) => {
    console.log('Received binary data:', body.length, 'bytes')
    await saveBinaryData(body)
    return { success: true, size: body.length }
  }
})
```

### Client Usage with Uint8Array
```ts
import { defineClient } from '@alien-rpc/client'
import api from './generated/api.js'

const client = defineClient(api)

// Create binary data
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello" in bytes

// Upload binary data
const result = await client.uploadBinary({
  body: binaryData
})

console.log('Upload result:', result) // { success: true, size: 5 }
```

### File Upload with Uint8Array
```ts
import { readFile } from 'fs/promises'

// Read file as Uint8Array
const fileBuffer = await readFile('./document.pdf')
const uint8Array = new Uint8Array(fileBuffer)

// Upload file as binary data
const uploadResult = await client.uploadDocument({
  filename: 'document.pdf',
  body: uint8Array
})
```

## Config/Flags

No configuration flags required. Feature is automatically available when routes define Uint8Array body types.

## Breaking/Migration

**Breaking Change:** No - purely additive enhancement  
**Migration Required:** No - existing routes continue to work unchanged

## Tags

`client` `binary-data` `uint8array` `request-body` `file-upload` `performance`

## Evidence

- Enhanced route type inference includes Uint8Array body support
- HTTP protocol handler recognizes Uint8Array instances
- Zero-copy binary data transfer without serialization overhead
- No base64 encoding required, avoiding 33% size increase
- Compatible with existing body type detection (Blob, FormData, ArrayBuffer)
- Native fetch API support for Uint8Array bodies