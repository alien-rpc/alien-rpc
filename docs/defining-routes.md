# Defining Routes

Learn how to define type-safe API routes with alien-rpc, including HTTP methods, path parameters, request validation, and middleware.

## Basic Route Definition

### Simple Routes

```ts
import { route } from '@alien-rpc/service'

// GET route with no parameters
export const getHealth = route.get('/health', async () => {
  return { status: 'ok', timestamp: new Date() }
})

// POST route with request body
export const createPost = route.post('/posts', async (data: {
  title: string
  content: string
}) => {
  return { id: 1, ...data, createdAt: new Date() }
})
```

### Route Arguments

Route handlers receive arguments in this order:
1. **Path parameters** (if any)
2. **Request data** (body for POST/PUT/PATCH, query for GET/DELETE)
3. **Request context** (optional)

```ts
// Path parameter only
const getUser = route.get('/users/:id', async (id: number) => {
  return await db.users.findById(id)
})

// Path parameter + request data
const updateUser = route.put('/users/:id', async (
  id: number,
  data: { name?: string; email?: string }
) => {
  return await db.users.update(id, data)
})

// All three arguments
const deleteUser = route.delete('/users/:id', async (
  id: number,
  query: { force?: boolean },
  ctx: RequestContext
) => {
  if (query.force && !ctx.user?.isAdmin) {
    throw new ForbiddenError('Admin required for force delete')
  }
  return await db.users.delete(id)
})
```

## HTTP Methods

alien-rpc supports all standard HTTP methods:

### GET Routes

```ts
// Simple GET
export const listPosts = route.get('/posts', async () => {
  return await db.posts.findMany()
})

// GET with query parameters
export const searchPosts = route.get('/posts/search', async (query: {
  q: string
  category?: string
  limit?: number
}) => {
  return await db.posts.search(query)
})

// GET with path parameters
export const getPost = route.get('/posts/:id', async (id: number) => {
  return await db.posts.findById(id)
})
```

### POST Routes

```ts
// Create resource
export const createPost = route.post('/posts', async (data: {
  title: string
  content: string
  categoryId: number
}) => {
  return await db.posts.create(data)
})

// Custom action
export const publishPost = route.post('/posts/:id/publish', async (
  id: number,
  data: { publishAt?: Date }
) => {
  return await db.posts.publish(id, data.publishAt)
})
```

### PUT Routes

```ts
// Full resource replacement
export const replacePost = route.put('/posts/:id', async (
  id: number,
  data: {
    title: string
    content: string
    categoryId: number
  }
) => {
  return await db.posts.replace(id, data)
})
```

### PATCH Routes

```ts
// Partial resource update
export const updatePost = route.patch('/posts/:id', async (
  id: number,
  data: {
    title?: string
    content?: string
    categoryId?: number
  }
) => {
  return await db.posts.update(id, data)
})
```

### DELETE Routes

```ts
// Delete resource
export const deletePost = route.delete('/posts/:id', async (id: number) => {
  await db.posts.delete(id)
  return { success: true }
})

// Delete with confirmation
export const deletePostConfirm = route.delete('/posts/:id', async (
  id: number,
  query: { confirm: boolean }
) => {
  if (!query.confirm) {
    throw new BadRequestError('Confirmation required')
  }
  await db.posts.delete(id)
  return { success: true }
})
```

### OPTIONS and HEAD Routes

```ts
// CORS preflight
export const postOptions = route.options('/posts', async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
})

// Resource metadata
export const postHead = route.head('/posts/:id', async (id: number) => {
  const exists = await db.posts.exists(id)
  return new Response(null, {
    status: exists ? 200 : 404,
    headers: {
      'X-Resource-Exists': exists.toString()
    }
  })
})
```

## Path Parameters

### Single Parameters

```ts
// Number parameter
const getUser = route.get('/users/:id', async (id: number) => {
  return await db.users.findById(id)
})

// String parameter
const getUserBySlug = route.get('/users/:slug', async (slug: string) => {
  return await db.users.findBySlug(slug)
})
```

### Multiple Parameters

```ts
// Multiple path parameters
const getComment = route.get('/posts/:postId/comments/:commentId', async (
  postId: number,
  commentId: number
) => {
  return await db.comments.findById(commentId, { postId })
})

// Mixed parameter types
const getUserPost = route.get('/users/:userId/posts/:slug', async (
  userId: number,
  slug: string
) => {
  return await db.posts.findBySlug(slug, { userId })
})
```

### Parameter Constraints

Path parameters are automatically validated based on their TypeScript types:

```ts
// Number validation
const getUser = route.get('/users/:id', async (id: number) => {
  // id is guaranteed to be a valid number
  return await db.users.findById(id)
})

// String validation (always passes)
const getCategory = route.get('/categories/:name', async (name: string) => {
  return await db.categories.findByName(name)
})
```

## Request Data Validation

### Basic Types

```ts
import { route, t } from '@alien-rpc/service'

// Simple validation
export const createUser = route.post('/users', async (data: {
  name: string
  email: string
  age: number
}) => {
  return await db.users.create(data)
})
```

### Type Constraints

```ts
// Advanced validation with constraints
export const createUser = route.post('/users', async (data: {
  name: string & t.MinLength<1> & t.MaxLength<100>
  email: string & t.Format<'email'>
  age: number & t.Minimum<0> & t.Maximum<120>
  bio?: string & t.MaxLength<500>
}) => {
  return await db.users.create(data)
})
```

### Nested Objects

```ts
// Nested object validation
export const createPost = route.post('/posts', async (data: {
  title: string & t.MinLength<1>
  content: string
  author: {
    id: number
    name: string
  }
  tags: Array<string & t.MinLength<1>>
  metadata?: {
    featured: boolean
    priority: number & t.Minimum<1> & t.Maximum<10>
  }
}) => {
  return await db.posts.create(data)
})
```

### Arrays and Collections

```ts
// Array validation
export const createBulkUsers = route.post('/users/bulk', async (data: {
  users: Array<{
    name: string & t.MinLength<1>
    email: string & t.Format<'email'>
  }> & t.MinItems<1> & t.MaxItems<100>
}) => {
  return await db.users.createMany(data.users)
})
```

## Route Documentation

### JSDoc Comments

Use JSDoc comments to document your routes. The generator extracts these for client documentation:

```ts
/**
 * Get a user by ID
 * 
 * @param id - The user ID
 * @returns The user object
 * @throws {NotFoundError} When user doesn't exist
 */
export const getUser = route.get('/users/:id', async (id: number) => {
  const user = await db.users.findById(id)
  if (!user) {
    throw new NotFoundError('User not found')
  }
  return user
})

/**
 * Create a new user
 * 
 * @param data - User creation data
 * @param data.name - Full name (1-100 characters)
 * @param data.email - Valid email address
 * @param data.age - Age in years (0-120)
 * @returns The created user with ID
 */
export const createUser = route.post('/users', async (data: {
  /** Full name */
  name: string & t.MinLength<1> & t.MaxLength<100>
  /** Email address */
  email: string & t.Format<'email'>
  /** Age in years */
  age: number & t.Minimum<0> & t.Maximum<120>
}) => {
  return await db.users.create(data)
})
```

## Request Context

### Accessing Context

The request context provides access to the underlying HTTP request and response:

```ts
import { RequestContext } from '@alien-rpc/service'

export const getProfile = route.get('/profile', async (
  query: {},
  ctx: RequestContext
) => {
  // Access request headers
  const userAgent = ctx.request.headers.get('user-agent')
  const authorization = ctx.request.headers.get('authorization')
  
  // Access request URL
  const url = new URL(ctx.request.url)
  
  // Custom context properties (set by middleware)
  const userId = ctx.user?.id
  
  return {
    userAgent,
    url: url.pathname,
    userId
  }
})
```

### Modifying Response

```ts
export const downloadFile = route.get('/files/:id', async (
  id: number,
  query: {},
  ctx: RequestContext
) => {
  const file = await db.files.findById(id)
  
  // Set response headers
  ctx.response.headers.set('Content-Type', file.mimeType)
  ctx.response.headers.set('Content-Disposition', `attachment; filename="${file.name}"`)
  
  // Set status code
  ctx.response.status = 200
  
  return file.content
})
```

## Response Types

### JSON Responses

Most routes return JSON-serializable data:

```ts
// Object response
export const getUser = route.get('/users/:id', async (id: number) => {
  return {
    id,
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date() // Automatically serialized to ISO string
  }
})

// Array response
export const listUsers = route.get('/users', async () => {
  return [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' }
  ]
})

// Primitive response
export const getUserCount = route.get('/users/count', async () => {
  return 42
})
```

### Custom Response Objects

For full control over the HTTP response:

```ts
export const downloadFile = route.get('/files/:id', async (id: number) => {
  const file = await getFileFromStorage(id)
  
  return new Response(file.stream, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': file.size.toString(),
      'Content-Disposition': `attachment; filename="${file.name}"`
    }
  })
})

export const redirectToProfile = route.get('/me', async () => {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/users/profile'
    }
  })
})
```

## Route Organization

### File Structure

Organize routes by feature or resource:

```
src/routes/
├── users/
│   ├── index.ts          # User CRUD operations
│   ├── auth.ts           # Authentication routes
│   └── profile.ts        # Profile management
├── posts/
│   ├── index.ts          # Post CRUD operations
│   ├── comments.ts       # Comment routes
│   └── tags.ts           # Tag management
└── admin/
    ├── users.ts          # Admin user management
    └── analytics.ts      # Analytics endpoints
```

### Route Grouping

```ts
// src/routes/users/index.ts
export const getUser = route.get('/users/:id', async (id: number) => {
  return await db.users.findById(id)
})

export const listUsers = route.get('/users', async (query: {
  page?: number
  limit?: number
}) => {
  return await db.users.findMany(query)
})

export const createUser = route.post('/users', async (data: UserCreateData) => {
  return await db.users.create(data)
})

export const updateUser = route.patch('/users/:id', async (
  id: number,
  data: UserUpdateData
) => {
  return await db.users.update(id, data)
})

export const deleteUser = route.delete('/users/:id', async (id: number) => {
  await db.users.delete(id)
  return { success: true }
})
```

### Compiling Routes

```ts
// src/server.ts
import { compileRoutes } from '@alien-rpc/service'
import * as userRoutes from './routes/users/index.js'
import * as postRoutes from './routes/posts/index.js'
import * as adminRoutes from './routes/admin/users.js'

const routes = compileRoutes({
  '/api/v1': {
    ...userRoutes,
    ...postRoutes
  },
  '/api/admin': {
    ...adminRoutes
  }
})
```

## Advanced Patterns

### Generic Route Handlers

```ts
// Generic CRUD operations
function createCrudRoutes<T extends { id: number }>(resource: string, service: CrudService<T>) {
  return {
    [`get${resource}`]: route.get(`/${resource.toLowerCase()}/:id`, async (id: number) => {
      return await service.findById(id)
    }),
    
    [`list${resource}`]: route.get(`/${resource.toLowerCase()}`, async (query: {
      page?: number
      limit?: number
    }) => {
      return await service.findMany(query)
    }),
    
    [`create${resource}`]: route.post(`/${resource.toLowerCase()}`, async (data: Omit<T, 'id'>) => {
      return await service.create(data)
    })
  }
}

// Usage
export const userRoutes = createCrudRoutes('User', userService)
export const postRoutes = createCrudRoutes('Post', postService)
```

### Route Composition

```ts
// Base route with common logic
function authenticatedRoute<P extends any[], R>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  handler: (...args: [...P, RequestContext & { user: User }]) => Promise<R>
) {
  return route[method](path, async (...args: [...P, RequestContext]) => {
    const ctx = args[args.length - 1] as RequestContext
    
    // Authentication logic
    const token = ctx.request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      throw new UnauthorizedError('Token required')
    }
    
    const user = await verifyToken(token)
    if (!user) {
      throw new UnauthorizedError('Invalid token')
    }
    
    // Call handler with authenticated context
    return handler(...args.slice(0, -1) as P, { ...ctx, user })
  })
}

// Usage
export const getProfile = authenticatedRoute('get', '/profile', async (ctx) => {
  return await db.users.findById(ctx.user.id)
})

export const updateProfile = authenticatedRoute('patch', '/profile', async (
  data: { name?: string; email?: string },
  ctx
) => {
  return await db.users.update(ctx.user.id, data)
})
```

## Best Practices

### 1. Consistent Naming

```ts
// Good: Consistent resource naming
export const getUser = route.get('/users/:id', ...)
export const listUsers = route.get('/users', ...)
export const createUser = route.post('/users', ...)
export const updateUser = route.patch('/users/:id', ...)
export const deleteUser = route.delete('/users/:id', ...)

// Bad: Inconsistent naming
export const fetchUser = route.get('/user/:id', ...)
export const getAllUsers = route.get('/users', ...)
export const addUser = route.post('/user', ...)
```

### 2. Proper HTTP Methods

```ts
// Good: Semantic HTTP methods
export const getUser = route.get('/users/:id', ...)        // Retrieve
export const createUser = route.post('/users', ...)        // Create
export const updateUser = route.patch('/users/:id', ...)   // Partial update
export const replaceUser = route.put('/users/:id', ...)    // Full replacement
export const deleteUser = route.delete('/users/:id', ...)  // Delete

// Bad: Wrong methods
export const getUser = route.post('/users/get', ...)       // Should be GET
export const deleteUser = route.get('/users/:id/delete', ...) // Should be DELETE
```

### 3. Input Validation

```ts
// Good: Comprehensive validation
export const createUser = route.post('/users', async (data: {
  name: string & t.MinLength<1> & t.MaxLength<100>
  email: string & t.Format<'email'>
  age: number & t.Minimum<0> & t.Maximum<120>
}) => {
  return await db.users.create(data)
})

// Bad: No validation
export const createUser = route.post('/users', async (data: any) => {
  return await db.users.create(data)
})
```

### 4. Error Handling

```ts
// Good: Proper error handling
export const getUser = route.get('/users/:id', async (id: number) => {
  const user = await db.users.findById(id)
  if (!user) {
    throw new NotFoundError('User not found')
  }
  return user
})

// Bad: No error handling
export const getUser = route.get('/users/:id', async (id: number) => {
  return await db.users.findById(id) // Might return null
})
```

---

**Next**: [Validation →](./validation.md) | **Previous**: [Getting Started ←](./getting-started.md)