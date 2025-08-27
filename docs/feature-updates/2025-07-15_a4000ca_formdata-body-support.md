# FormData Body Type Support

**Commit:** a4000cad0f7399c31de8b3fb208d0ffef1508d03  
**Author:** Alec Larson  
**Date:** Tue Jul 15 15:15:41 2025 -0400  
**Short SHA:** a4000ca  
**Status:** Enhancement

## Summary

Adds support for `FormData` as a request body type, enabling seamless handling of form submissions, file uploads, and multipart data without breaking existing functionality.

## User-Visible Changes

- Routes can now accept `FormData` objects as request bodies
- Automatic detection and parsing of multipart/form-data content
- Native handling of file uploads through FormData
- Direct processing of HTML form submissions
- HTTP protocol handler automatically detects FormData instances
- Full TypeScript support for FormData in route signatures
- Code generator supports FormData types

## Examples

```ts
// FormData detection in HTTP protocol handler
if (
  params.body instanceof FormData ||
  params.body instanceof Blob ||
  params.body instanceof ArrayBuffer
) {
  request.body = params.body
}

// Server-side content-type handling
if (contentType.startsWith('multipart/form-data')) {
  return request.formData()
}

// Route definition with FormData body
export const submitContactForm = defineRoute({
  method: 'POST',
  path: '/api/contact/submit',
  handler: async (pathParams: {}, searchParams: {}, body: FormData) => {
    const name = body.get('name') as string
    const email = body.get('email') as string
    
    return { success: true, contactId: await saveContactForm({ name, email }) }
  }
})

// Client usage
const formData = new FormData()
formData.append('name', 'John Doe')
formData.append('email', 'john@example.com')

const result = await client.submitContactForm({ body: formData })
```

## Config/Flags

- FormData instances automatically detected by HTTP protocol handler
- Multipart/form-data content automatically parsed as FormData
- Works out of the box with existing route definitions
- TypeScript automatically infers FormData body types
- Generator represents FormData as `Type.Any()` in schemas

## Breaking/Migration

- **Breaking**: None - purely additive enhancement to existing functionality
- **Migration**: No migration required; existing Blob, ArrayBuffer, and other body types continue to work

## Tags

`client`, `body-types`, `formdata`, `file-upload`, `multipart`, `forms`, `enhancement`

## Evidence

- **Modified files**: `protocols/http.ts`, `types.ts`, `compileRoute.ts`, `typebox-codegen/index.ts`
- **Body type detection**: FormData added to instanceof checks in HTTP protocol handler
- **Content-type parsing**: Multipart/form-data content automatically parsed as FormData
- **Type system**: FormData included in body type unions for route functions
- **Code generation**: TypeBox generator supports FormData types as `Type.Any()`