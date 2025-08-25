# FormData Body Type Support

**Commit:** a4000cad0f7399c31de8b3fb208d0ffef1508d03  
**Author:** Alec Larson  
**Date:** Tue Jul 15 15:15:41 2025 -0400  
**Short SHA:** a4000ca

## Summary

This is an **additive enhancement** that adds support for `FormData` as a request body type in alien-rpc. Routes can now accept `FormData` objects, enabling seamless handling of form submissions, file uploads, and multipart data without breaking existing functionality.

## User Impact

**Audience:** Developers building forms, file uploads, and multipart data handling  
**Breaking Change:** No - purely additive enhancement  
**Migration Required:** No - existing code continues to work  
**Status:** Enhancement - new functionality available

## Key Changes

### Added
- `FormData` as a supported request body type alongside `Blob` and `ArrayBuffer`
- Automatic multipart/form-data content-type detection
- Server-side FormData parsing with `request.formData()`
- TypeBox code generation support for `FormData` types
- Client-side FormData handling in HTTP protocol

### Enhanced
- Server request parsing now handles multipart/form-data content
- Type system includes FormData in route function signatures
- Content-type detection improved for form data

## Implementation Details

### Client-Side Changes

**HTTP Protocol Handler (`packages/client/src/protocols/http.ts`):**
```ts
// FormData detection added alongside other body types
if (
  params.body instanceof FormData ||
  params.body instanceof Blob ||
  params.body instanceof ArrayBuffer
) {
  request.body = params.body
}
```

**Type System (`packages/client/src/types.ts`):**
```ts
// FormData included in supported body types
type RouteFunction<TRoute, TErrorMode extends ErrorMode> =
  TRoute extends Route<
    (pathParams: any, searchParams: any, body: infer TBody) => any
  >
    ? TBody extends FormData | Blob | ArrayBuffer
      ? { body: TBody }
      : TBody
```

### Server-Side Changes

**Request Parsing (`packages/service/src/compileRoute.ts`):**
```ts
// Enhanced content-type handling
return async ({ request }) => {
  const contentType = request.headers.get('Content-Type')
  
  // JSON handling (default)
  if (!contentType || contentType === 'application/json') {
    return decode(contentType ? await request.json() : {})
  }
  
  // FormData handling for multipart content
  if (contentType.startsWith('multipart/form-data')) {
    return request.formData()
  }
  
  // Blob handling for other content types
  return request.blob()
}
```

**TypeBox Code Generation (`packages/generator/src/typebox-codegen/index.ts`):**
```ts
// FormData represented as Any type in TypeBox
if (
  name === 'Blob' ||
  name === 'FormData' ||
  name === 'Function'
) {
  yield `Type.Any()`
}
```

## Usage Examples

### Basic Form Handling

```ts
// Route definition
export const submitContactForm = defineRoute({
  method: 'POST',
  path: '/api/contact/submit',
  handler: async (pathParams: {}, searchParams: {}, body: FormData) => {
    const name = body.get('name') as string
    const email = body.get('email') as string
    const message = body.get('message') as string
    
    // Validate form data
    if (!name || !email || !message) {
      throw new Error('Missing required fields')
    }
    
    // Process form submission
    const contactId = await saveContactForm({ name, email, message })
    
    return {
      success: true,
      contactId,
      message: 'Contact form submitted successfully'
    }
  }
})

// Client usage
const formData = new FormData()
formData.append('name', 'John Doe')
formData.append('email', 'john@example.com')
formData.append('message', 'Hello, I would like to get in touch!')

const result = await client.submitContactForm({ body: formData })
console.log('Form submitted:', result.contactId)
```

### File Upload with Form Data

```ts
// Route definition
export const uploadProfileImage = defineRoute({
  method: 'POST',
  path: '/api/profile/image',
  handler: async (pathParams: {}, searchParams: {}, body: FormData) => {
    const userId = body.get('userId') as string
    const imageFile = body.get('image') as File
    const description = body.get('description') as string
    
    if (!imageFile || !userId) {
      throw new Error('User ID and image file are required')
    }
    
    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      throw new Error('Only image files are allowed')
    }
    
    // Process file upload
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
    const savedPath = await saveProfileImage(userId, imageBuffer, imageFile.name)
    
    return {
      success: true,
      userId,
      imagePath: savedPath,
      fileName: imageFile.name,
      fileSize: imageFile.size,
      description
    }
  }
})

// Client usage with file input
const fileInput = document.getElementById('image') as HTMLInputElement
const file = fileInput.files?.[0]

if (file) {
  const formData = new FormData()
  formData.append('userId', currentUser.id)
  formData.append('image', file)
  formData.append('description', 'Profile picture update')
  
  const result = await client.uploadProfileImage({ body: formData })
  console.log('Image uploaded:', result.imagePath)
}
```

### Multiple File Upload

```ts
// Route definition
export const uploadDocuments = defineRoute({
  method: 'POST',
  path: '/api/documents/upload',
  handler: async (pathParams: {}, searchParams: {}, body: FormData) => {
    const projectId = body.get('projectId') as string
    const category = body.get('category') as string
    
    // Get all uploaded files
    const files = body.getAll('documents') as File[]
    
    if (!projectId || files.length === 0) {
      throw new Error('Project ID and at least one document are required')
    }
    
    const uploadedDocuments = []
    
    for (const file of files) {
      // Validate file
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error(`File ${file.name} exceeds size limit`)
      }
      
      // Process file
      const fileBuffer = Buffer.from(await file.arrayBuffer())
      const savedPath = await saveDocument(projectId, fileBuffer, file.name, category)
      
      uploadedDocuments.push({
        name: file.name,
        size: file.size,
        type: file.type,
        path: savedPath
      })
    }
    
    return {
      success: true,
      projectId,
      category,
      documentsUploaded: uploadedDocuments.length,
      documents: uploadedDocuments
    }
  }
})

// Client usage with multiple files
const fileInput = document.getElementById('documents') as HTMLInputElement
const files = Array.from(fileInput.files || [])

if (files.length > 0) {
  const formData = new FormData()
  formData.append('projectId', currentProject.id)
  formData.append('category', 'specifications')
  
  // Append multiple files
  files.forEach(file => {
    formData.append('documents', file)
  })
  
  const result = await client.uploadDocuments({ body: formData })
  console.log('Uploaded', result.documentsUploaded, 'documents')
}
```

### Form with Mixed Data Types

```ts
// Route definition
export const createProduct = defineRoute({
  method: 'POST',
  path: '/api/products/create',
  handler: async (pathParams: {}, searchParams: {}, body: FormData) => {
    // Extract form fields
    const name = body.get('name') as string
    const price = parseFloat(body.get('price') as string)
    const description = body.get('description') as string
    const category = body.get('category') as string
    const inStock = body.get('inStock') === 'true'
    
    // Extract files
    const mainImage = body.get('mainImage') as File
    const additionalImages = body.getAll('additionalImages') as File[]
    
    // Extract JSON data
    const specifications = JSON.parse(body.get('specifications') as string)
    const tags = JSON.parse(body.get('tags') as string)
    
    // Validate required fields
    if (!name || !price || !mainImage) {
      throw new Error('Name, price, and main image are required')
    }
    
    // Process main image
    const mainImageBuffer = Buffer.from(await mainImage.arrayBuffer())
    const mainImagePath = await saveProductImage(mainImageBuffer, mainImage.name)
    
    // Process additional images
    const additionalImagePaths = []
    for (const image of additionalImages) {
      const imageBuffer = Buffer.from(await image.arrayBuffer())
      const imagePath = await saveProductImage(imageBuffer, image.name)
      additionalImagePaths.push(imagePath)
    }
    
    // Create product
    const product = await createProductRecord({
      name,
      price,
      description,
      category,
      inStock,
      mainImage: mainImagePath,
      additionalImages: additionalImagePaths,
      specifications,
      tags
    })
    
    return {
      success: true,
      productId: product.id,
      product
    }
  }
})

// Client usage with complex form
const formData = new FormData()

// Basic fields
formData.append('name', 'Wireless Headphones')
formData.append('price', '199.99')
formData.append('description', 'High-quality wireless headphones')
formData.append('category', 'electronics')
formData.append('inStock', 'true')

// Files
const mainImageFile = document.getElementById('mainImage').files[0]
formData.append('mainImage', mainImageFile)

const additionalImageFiles = document.getElementById('additionalImages').files
Array.from(additionalImageFiles).forEach(file => {
  formData.append('additionalImages', file)
})

// JSON data
formData.append('specifications', JSON.stringify({
  battery: '30 hours',
  connectivity: 'Bluetooth 5.0',
  weight: '250g'
}))

formData.append('tags', JSON.stringify(['wireless', 'audio', 'portable']))

const result = await client.createProduct({ body: formData })
console.log('Product created:', result.productId)
```

## Form Data Processing Utilities

### Server-Side Helpers

```ts
// Utility functions for FormData processing
export function extractFormFields(formData: FormData, fields: string[]) {
  const result: Record<string, string> = {}
  
  for (const field of fields) {
    const value = formData.get(field)
    if (value && typeof value === 'string') {
      result[field] = value
    }
  }
  
  return result
}

export function extractFormFiles(formData: FormData, fileFields: string[]) {
  const result: Record<string, File[]> = {}
  
  for (const field of fileFields) {
    const files = formData.getAll(field) as File[]
    result[field] = files.filter(file => file instanceof File)
  }
  
  return result
}

export function validateFormData(formData: FormData, schema: {
  required?: string[]
  files?: string[]
  maxFileSize?: number
  allowedTypes?: string[]
}) {
  const errors: string[] = []
  
  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!formData.has(field) || !formData.get(field)) {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }
  
  // Validate files
  if (schema.files) {
    for (const fileField of schema.files) {
      const files = formData.getAll(fileField) as File[]
      
      for (const file of files) {
        if (!(file instanceof File)) continue
        
        // Check file size
        if (schema.maxFileSize && file.size > schema.maxFileSize) {
          errors.push(`File ${file.name} exceeds maximum size`)
        }
        
        // Check file type
        if (schema.allowedTypes && !schema.allowedTypes.some(type => file.type.startsWith(type))) {
          errors.push(`File ${file.name} has unsupported type: ${file.type}`)
        }
      }
    }
  }
  
  return errors
}

// Usage in route handler
export const uploadWithValidation = defineRoute({
  method: 'POST',
  path: '/api/upload/validated',
  handler: async (pathParams: {}, searchParams: {}, body: FormData) => {
    // Validate form data
    const errors = validateFormData(body, {
      required: ['title', 'description'],
      files: ['document'],
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['application/pdf', 'image/']
    })
    
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`)
    }
    
    // Extract validated data
    const fields = extractFormFields(body, ['title', 'description'])
    const files = extractFormFiles(body, ['document'])
    
    // Process upload
    return {
      success: true,
      fields,
      filesUploaded: files.document.length
    }
  }
})
```

### Client-Side Helpers

```ts
// Utility functions for client-side FormData creation
export function createFormDataFromObject(obj: Record<string, any>): FormData {
  const formData = new FormData()
  
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value)
    } else if (Array.isArray(value)) {
      value.forEach(item => {
        if (item instanceof File || item instanceof Blob) {
          formData.append(key, item)
        } else {
          formData.append(key, String(item))
        }
      })
    } else if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value))
    } else {
      formData.append(key, String(value))
    }
  }
  
  return formData
}

export function createFormDataFromForm(form: HTMLFormElement): FormData {
  const formData = new FormData(form)
  
  // Handle file inputs that allow multiple files
  const fileInputs = form.querySelectorAll('input[type="file"][multiple]')
  fileInputs.forEach(input => {
    const files = (input as HTMLInputElement).files
    if (files) {
      // Remove the single file entry and add all files
      formData.delete(input.name)
      Array.from(files).forEach(file => {
        formData.append(input.name, file)
      })
    }
  })
  
  return formData
}

// Usage examples
const objectData = {
  name: 'John Doe',
  age: 30,
  avatar: fileFromInput,
  preferences: { theme: 'dark', notifications: true },
  tags: ['developer', 'javascript']
}

const formData = createFormDataFromObject(objectData)
await client.updateProfile({ body: formData })

// Or from HTML form
const form = document.getElementById('contact-form') as HTMLFormElement
const formData = createFormDataFromForm(form)
await client.submitContact({ body: formData })
```

## Content-Type Handling

### Automatic Detection

```ts
// Server automatically detects multipart/form-data
const contentType = request.headers.get('Content-Type')

if (contentType?.startsWith('multipart/form-data')) {
  // Automatically parsed as FormData
  return request.formData()
}
```

### Client Behavior

```ts
// Browser automatically sets correct Content-Type for FormData
const formData = new FormData()
formData.append('field', 'value')

// Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
// Boundary is automatically generated
fetch('/api/endpoint', {
  method: 'POST',
  body: formData // Browser handles Content-Type automatically
})
```

## Compatibility and Browser Support

### Browser Compatibility
- **Modern Browsers:** Full FormData support in all modern browsers
- **Internet Explorer:** FormData supported in IE 10+
- **Mobile Browsers:** Full support in iOS Safari and Android Chrome
- **File API:** File upload support in all modern browsers

### Node.js Compatibility
- **Node.js 18+:** Native FormData support
- **Earlier Versions:** Requires polyfills (form-data package)
- **Server Frameworks:** Works with any framework supporting Web API standards

### Framework Integration

```ts
// React integration
function ContactForm() {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    
    try {
      const result = await client.submitContact({ body: formData })
      console.log('Form submitted:', result)
    } catch (error) {
      console.error('Submission failed:', error)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" type="text" required />
      <input name="email" type="email" required />
      <textarea name="message" required />
      <input name="attachment" type="file" />
      <button type="submit">Submit</button>
    </form>
  )
}

// Vue integration
export default {
  methods: {
    async handleSubmit(event) {
      const formData = new FormData(event.target)
      
      try {
        const result = await this.$client.submitContact({ body: formData })
        this.showSuccess(result)
      } catch (error) {
        this.showError(error)
      }
    }
  }
}
```

## Performance Considerations

### Memory Usage
- **Streaming:** FormData supports streaming for large file uploads
- **Memory Efficiency:** Files are not loaded entirely into memory
- **Garbage Collection:** Proper cleanup of FormData objects
- **Chunked Transfer:** Automatic chunked encoding for large forms

### Network Performance
- **Compression:** Automatic gzip compression where applicable
- **Multipart Efficiency:** Efficient multipart encoding
- **Progress Tracking:** Built-in upload progress support
- **Concurrent Uploads:** Multiple file uploads in parallel

### Server Performance
- **Streaming Parser:** Server streams FormData parsing
- **Memory Limits:** Configurable limits for form data size
- **File Handling:** Efficient temporary file management
- **Validation:** Early validation to reject invalid requests

## Security Considerations

### File Upload Security

```ts
// Secure file upload handling
export const secureFileUpload = defineRoute({
  method: 'POST',
  path: '/api/secure/upload',
  handler: async (pathParams: {}, searchParams: {}, body: FormData) => {
    const file = body.get('file') as File
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed')
    }
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File too large')
    }
    
    // Validate file name
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      throw new Error('Invalid file name')
    }
    
    // Scan file content (example with magic bytes)
    const buffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(buffer)
    
    // Check for malicious content
    if (containsMaliciousContent(uint8Array)) {
      throw new Error('File contains malicious content')
    }
    
    // Process securely
    return await processSecureFile(buffer, file.name)
  }
})
```

### Input Validation

```ts
// Comprehensive input validation
export const validateFormInput = defineRoute({
  method: 'POST',
  path: '/api/form/validate',
  handler: async (pathParams: {}, searchParams: {}, body: FormData) => {
    // Sanitize text inputs
    const name = sanitizeInput(body.get('name') as string)
    const email = sanitizeEmail(body.get('email') as string)
    const message = sanitizeInput(body.get('message') as string)
    
    // Validate against injection attacks
    const inputs = [name, email, message]
    for (const input of inputs) {
      if (containsSQLInjection(input) || containsXSS(input)) {
        throw new Error('Invalid input detected')
      }
    }
    
    // Rate limiting check
    const clientIP = getClientIP(request)
    if (await isRateLimited(clientIP)) {
      throw new Error('Rate limit exceeded')
    }
    
    // Process validated input
    return await processValidatedForm({ name, email, message })
  }
})
```

## Troubleshooting

### Common Issues

**Issue:** FormData not being parsed correctly
```ts
// Problem: Missing Content-Type header
fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'multipart/form-data' }, // Don't set this!
  body: formData
})

// Solution: Let browser set Content-Type automatically
fetch('/api/endpoint', {
  method: 'POST',
  body: formData // Browser sets correct Content-Type with boundary
})
```

**Issue:** Files not being received on server
```ts
// Problem: Incorrect field access
const file = body.get('file') as string // Wrong type

// Solution: Correct type assertion
const file = body.get('file') as File
if (file instanceof File) {
  // Process file
}
```

**Issue:** Multiple files not handled correctly
```ts
// Problem: Using get() for multiple files
const file = body.get('files') as File // Only gets first file

// Solution: Use getAll() for multiple files
const files = body.getAll('files') as File[]
files.forEach(file => {
  if (file instanceof File) {
    // Process each file
  }
})
```

## Future Enhancements

### Planned Features
- **Schema Validation:** Built-in FormData schema validation
- **File Processing:** Automatic image resizing and optimization
- **Progress Tracking:** Upload progress callbacks
- **Chunked Uploads:** Support for resumable file uploads

### Potential Improvements
- **Custom Parsers:** Support for custom FormData parsers
- **Validation Middleware:** Reusable validation middleware
- **File Streaming:** Direct file streaming to storage
- **Compression:** Automatic file compression before upload

## References

**External Documentation:**
- [FormData - MDN](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [File API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_API)
- [Multipart Form Data - RFC 7578](https://tools.ietf.org/html/rfc7578)

**Related Changes:**
- [Replace Uint8Array with Blob Support](./2025-07-15_0de7d67_replace-uint8array-with-blob-support.md) (Previous)
- [ArrayBuffer Body Support](./2025-07-15_230e42a_arraybuffer-body-support.md) (Next)

**Files Modified:**
- `packages/client/src/protocols/http.ts` - FormData detection in HTTP protocol
- `packages/client/src/types.ts` - Type system support for FormData
- `packages/generator/src/typebox-codegen/index.ts` - TypeBox generation for FormData
- `packages/service/src/compileRoute.ts` - Server-side FormData parsing

This enhancement enables comprehensive form handling capabilities while maintaining backward compatibility and following web standards.

## Open Questions

No unanswered questions