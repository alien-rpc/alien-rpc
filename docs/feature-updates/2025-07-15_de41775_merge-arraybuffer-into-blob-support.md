# Merge ArrayBuffer Support into Blob Support

**Commit:** de41775 | 2025-07-15 | Alec Larson

## Summary
Consolidates binary data handling by merging ArrayBuffer support into Blob support. Routes use `Blob` as body type while clients can pass `Blob`, `ArrayBuffer`, or `Uint8Array`.

## User-visible changes
- Routes must use `Blob` instead of `ArrayBuffer` for binary data (breaking)
- Clients can pass `Blob`, `ArrayBuffer`, or `Uint8Array` to Blob routes
- Simplified type system with unified binary handling
- Enhanced client flexibility for binary data submission

## Examples

### Route Definition (Before/After)

**Before:**
```ts
export const processArrayBuffer = defineRoute({
  method: 'POST',
  path: '/api/process/arraybuffer',
  handler: async (pathParams: {}, searchParams: {}, body: ArrayBuffer) => {
    const view = new DataView(body)
    return { value: view.getUint32(0, true), size: body.byteLength }
  }
})
```

**After:**
```ts
export const processBinaryData = defineRoute({
  method: 'POST',
  path: '/api/process/binary',
  handler: async (pathParams: {}, searchParams: {}, body: Blob) => {
    const arrayBuffer = await body.arrayBuffer()
    const view = new DataView(arrayBuffer)
    return { value: view.getUint32(0, true), size: body.size }
  }
})
```

### Client Usage

```ts
const arrayBuffer = new ArrayBuffer(8)
const view = new DataView(arrayBuffer)
view.setUint32(0, 42, true)

// All of these work with the same Blob route:
const result1 = await client.processBinaryData({ body: arrayBuffer })
const result2 = await client.processBinaryData({ body: new Blob([arrayBuffer]) })
const result3 = await client.processBinaryData({ body: new Uint8Array(arrayBuffer) })
```
## Breaking/Migration
- Update route handlers from `ArrayBuffer` to `Blob` parameter type
- Use `await body.arrayBuffer()` to convert Blob to ArrayBuffer for processing
- Client code continues to work with ArrayBuffer/Uint8Array inputs

## Tags
api, breaking, migration

## Evidence
- `packages/client/src/protocols/http.ts` - Added Uint8Array support
- `packages/client/src/types.ts` - Unified Blob type with client flexibility
- `packages/generator/src/typebox-codegen/index.ts` - Removed ArrayBuffer generation