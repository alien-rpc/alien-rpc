# ArrayBuffer Body Type Support

**Commit:** 230e42a7bfa328b8ac0b8e4981668390f51c514e  
**Author:** Alec Larson  
**Date:** Tue Jul 15 20:25:21 2025 -0400  
**Short SHA:** 230e42a

## Summary

Adds support for `ArrayBuffer` as a request body type, enabling efficient handling of raw binary data, typed arrays, and low-level binary operations.

## User-Visible Changes

- **ArrayBuffer body support**: Routes can now accept `ArrayBuffer` objects as request bodies
- **Binary data handling**: Efficient processing of raw binary data, WebAssembly modules, and typed arrays
- **Client-side detection**: HTTP protocol handler automatically detects and transmits ArrayBuffer instances
- **Type system integration**: Full TypeScript support for ArrayBuffer in route signatures
- **TypeBox generation**: Code generator supports ArrayBuffer types
- **Non-breaking**: Purely additive enhancement, existing code continues to work
- **Complete binary coverage**: Complements existing Blob, FormData, and Uint8Array support

## Examples

### HTTP Protocol Handler
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

### Type System Integration
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

### Basic Usage
```ts
// Route definition
export const processBinaryData = defineRoute({
  method: 'POST',
  path: '/api/data/process',
  handler: async (pathParams: {}, searchParams: {}, body: ArrayBuffer) => {
    const uint8Array = new Uint8Array(body)
    const dataView = new DataView(body)
    
    // Process binary data
    return {
      success: true,
      size: body.byteLength,
      processed: uint8Array.length
    }
  }
})

// Client usage
const binaryData = new ArrayBuffer(1024)
const result = await client.processBinaryData({ body: binaryData })
```

## Config/Flags

- **Automatic detection**: ArrayBuffer instances automatically detected by HTTP protocol handler
- **No configuration**: Works out of the box with existing route definitions
- **Type inference**: TypeScript automatically infers ArrayBuffer body types
- **TypeBox integration**: Generator represents ArrayBuffer as `Type.Any()` in schemas

## Breaking/Migration

- **Non-breaking**: Purely additive enhancement to existing functionality
- **No migration**: Existing Blob, FormData, and other body types continue to work
- **Backward compatible**: No changes to existing API surface
- **Gradual adoption**: Can be adopted incrementally alongside existing body types

## Tags

`client` `body-types` `binary-data` `arraybuffer` `webassembly` `typed-arrays` `enhancement`

## Evidence

- **Modified files**: `packages/client/src/protocols/http.ts`, `packages/client/src/types.ts`, `packages/generator/src/typebox-codegen/index.ts`
- **Body type detection**: ArrayBuffer added to instanceof checks in HTTP protocol handler
- **Type system**: ArrayBuffer included in body type unions for route functions
- **Code generation**: TypeBox generator supports ArrayBuffer types as `Type.Any()`
- **Binary data support**: Enables WebAssembly, cryptographic operations, and low-level binary processing