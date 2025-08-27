# Getting Started

This guide will help you set up alien-rpc and create your first type-safe API in minutes.

## Prerequisites

- **Node.js** 18+ or **Bun** 1.0+
- **TypeScript** 5.0+
- A package manager: **pnpm** (recommended), **npm**, or **yarn**

## Installation

### Quick Setup

Install the main package and TypeBox for runtime validation:

```bash
pnpm add alien-rpc @sinclair/typebox
```

### Individual Packages

For more control, install packages separately:

```bash
# Core packages
pnpm add @alien-rpc/service @alien-rpc/client @alien-rpc/generator

# Runtime validation
pnpm add @sinclair/typebox

# HTTP server (choose one)
pnpm add @hattip/adapter-node     # Node.js
pnpm add @hattip/adapter-bun      # Bun
pnpm add @hattip/adapter-vercel   # Vercel
```

## Project Structure

Recommended project structure:

```
my-api/
├── src/
│   ├── routes/
│   │   ├── users.ts          # User routes
│   │   └── posts.ts          # Post routes
│   ├── server.ts             # HTTP server setup
│   └── types.ts              # Shared types
├── client/
│   └── api.ts                # Generated client (auto-created)
├── package.json
└── tsconfig.json
```

## Your First API

### 1. Define Routes

Create `src/routes/users.ts`:

```ts
import { route, t } from '@alien-rpc/service'

// Simple GET route with path parameter
export const getUser = route.get('/users/:id', async (id: number) => {
  // Simulate database lookup
  return {
    id,
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date()
  }
})

// POST route with request validation
export const createUser = route.post('/users', async (data: {
  name: string & t.MinLength<1>
  email: string & t.Format<'email'>
  age?: number & t.Minimum<0>
}) => {
  // Simulate user creation
  const user = {
    id: Math.floor(Math.random() * 1000),
    ...data,
    createdAt: new Date()
  }
  
  return user
})

// GET route with query parameters
export const listUsers = route.get('/users', async (query: {
  page?: number & t.Minimum<1>
  limit?: number & t.Minimum<1> & t.Maximum<100>
  search?: string
}) => {
  const { page = 1, limit = 10, search } = query
  
  // Simulate database query
  const users = Array.from({ length: limit }, (_, i) => ({
    id: (page - 1) * limit + i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`
  }))
  
  return {
    users,
    pagination: {
      page,
      limit,
      total: 100,
      pages: Math.ceil(100 / limit)
    }
  }
})
```

### 2. Set Up HTTP Server

Create `src/server.ts`:

```ts
import { compileRoutes } from '@alien-rpc/service'
import { createServer } from '@hattip/adapter-node'

// Import all your routes
import * as userRoutes from './routes/users.js'

// Compile routes into middleware
const routes = compileRoutes({
  '/api': {
    ...userRoutes
  }
})

// Create HTTP server
const server = createServer(routes)

const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`)
  console.log(`📚 API routes available at http://localhost:${port}/api`)
})
```

### 3. Generate Client Code

Add a script to your `package.json`:

```json
{
  "scripts": {
    "build:client": "alien-rpc 'src/routes/**/*.ts' --clientOutFile client/api.ts",
    "dev": "alien-rpc 'src/routes/**/*.ts' --clientOutFile client/api.ts --watch & tsx --watch src/server.ts"
  }
}
```

Generate the client:

```bash
pnpm run build:client
```

This creates `client/api.ts` with type-safe client functions.

### 4. Use the Generated Client

Create a test file or use in your frontend:

```ts
import { defineClient } from '@alien-rpc/client'
import * as API from '../client/api.js'

// Create client instance
const client = defineClient(API, {
  prefixUrl: 'http://localhost:3000/api'
})

// Use the client (fully type-safe!)
async function example() {
  // GET /api/users/123
  const user = await client.getUser(123)
  console.log(user.name) // TypeScript knows this is a string
  
  // POST /api/users
  const newUser = await client.createUser({
    name: 'Jane Doe',
    email: 'jane@example.com',
    age: 25
  })
  
  // GET /api/users?page=1&limit=5
  const userList = await client.listUsers({
    page: 1,
    limit: 5,
    search: 'john'
  })
  
  console.log(`Found ${userList.users.length} users`)
}

example().catch(console.error)
```

### 5. Run Your API

```bash
# Development with auto-reload
pnpm run dev

# Or run manually
pnpm run build:client
tsx src/server.ts
```

Your API is now running at `http://localhost:3000`!

## Testing Your API

### Using curl

```bash
# Get a user
curl http://localhost:3000/api/users/123

# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com"}'

# List users with pagination
curl "http://localhost:3000/api/users?page=1&limit=5"
```

### Using the Client

```ts
// test-client.ts
import { defineClient } from '@alien-rpc/client'
import * as API from './client/api.js'

const client = defineClient(API, {
  prefixUrl: 'http://localhost:3000/api'
})

// Test all endpoints
async function testAPI() {
  try {
    // Test user creation
    const newUser = await client.createUser({
      name: 'Test User',
      email: 'test@example.com'
    })
    console.log('✅ Created user:', newUser)
    
    // Test user retrieval
    const user = await client.getUser(newUser.id)
    console.log('✅ Retrieved user:', user)
    
    // Test user listing
    const users = await client.listUsers({ limit: 3 })
    console.log('✅ Listed users:', users.pagination)
    
  } catch (error) {
    console.error('❌ API Error:', error)
  }
}

testAPI()
```

## Development Workflow

### Watch Mode

For development, use watch mode to automatically regenerate the client when routes change:

```bash
# Terminal 1: Watch and regenerate client
alien-rpc 'src/routes/**/*.ts' --clientOutFile client/api.ts --watch

# Terminal 2: Run server with auto-reload
tsx --watch src/server.ts
```

### TypeScript Configuration

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*", "client/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Next Steps

Now that you have a working API:

1. **[Define More Routes](./defining-routes.md)** - Learn about HTTP methods, middleware, and advanced patterns
2. **[Add Validation](./validation.md)** - Use type constraints for robust input validation
3. **[Configure the Client](./client.md)** - Customize client behavior, error handling, and retries
4. **[Add Streaming](./streaming.md)** - Implement real-time features with JSON streaming
5. **[Handle Errors](./error-handling.md)** - Create custom HTTP errors and error responses

## Common Issues

### Import Errors

If you get import errors, ensure:
- You're using `.js` extensions in imports (TypeScript requirement)
- Your `tsconfig.json` has `"moduleResolution": "bundler"`
- Generated client files are included in your TypeScript project

### Validation Errors

If runtime validation fails:
- Check that request data matches your TypeScript types
- Ensure TypeBox constraints are properly applied
- Use the `--verbose` flag with the generator for debugging

### Server Errors

If the server won't start:
- Verify all route imports are correct
- Check that Hattip adapter is installed
- Ensure no circular dependencies in your route files

---

**Next**: [Defining Routes →](./defining-routes.md)