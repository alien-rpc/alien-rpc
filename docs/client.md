# Client Usage

Learn how to configure and use the alien-rpc client for type-safe API communication.

## Overview

The alien-rpc client provides a type-safe wrapper around `fetch` using JavaScript Proxy objects. It automatically generates methods that mirror your server routes with full TypeScript support.

```ts
import { defineClient } from '@alien-rpc/client'
import * as API from './generated/api.js'

// Create client instance
const client = defineClient(API, {
  prefixUrl: 'https://api.example.com'
})

// Use generated methods (fully type-safe)
const user = await client.getUser(123)
const newUser = await client.createUser({ name: 'John', email: 'john@example.com' })
```

## Client Configuration

### Basic Setup

```ts
import { defineClient } from '@alien-rpc/client'
import * as API from './generated/api.js'

const client = defineClient(API, {
  // Base URL for all requests
  prefixUrl: 'https://api.example.com',
  
  // Default headers
  headers: {
    'Authorization': 'Bearer ' + token,
    'X-Client-Version': '1.0.0'
  },
  
  // Request timeout (milliseconds)
  timeout: 30000,
  
  // Retry configuration
  retry: {
    limit: 3,
    methods: ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504]
  }
})
```

### Advanced Configuration

```ts
const client = defineClient(API, {
  prefixUrl: 'https://api.example.com',
  
  // Custom fetch implementation
  fetch: customFetch,
  
  // Error handling mode
  errorMode: 'throw', // 'throw' | 'return'
  
  // Request/response hooks
  hooks: {
    beforeRequest: [
      (request) => {
        console.log('Making request:', request.url)
        request.headers.set('X-Request-ID', generateId())
      }
    ],
    afterResponse: [
      (request, options, response) => {
        console.log('Response received:', response.status)
        return response
      }
    ],
    beforeError: [
      (error) => {
        console.error('Request failed:', error.message)
        return error
      }
    ]
  },
  
  // WebSocket configuration
  ws: {
    url: 'wss://api.example.com/ws',
    protocols: ['alien-rpc'],
    reconnect: true,
    maxReconnectAttempts: 5,
    reconnectInterval: 1000
  }
})
```

## Making Requests

### Basic Route Calls

```ts
// GET /users/123
const user = await client.getUser(123)

// POST /users
const newUser = await client.createUser({
  name: 'John Doe',
  email: 'john@example.com'
})

// PATCH /users/123
const updatedUser = await client.updateUser(123, {
  name: 'Jane Doe'
})

// DELETE /users/123
await client.deleteUser(123)
```

### Routes with Query Parameters

```ts
// GET /users?page=1&limit=10&search=john
const users = await client.listUsers({
  page: 1,
  limit: 10,
  search: 'john'
})

// GET /posts?category=tech&published=true
const posts = await client.getPosts({
  category: 'tech',
  published: true
})
```

### Complex Path Parameters

```ts
// GET /users/123/posts/456/comments
const comments = await client.getUserPostComments(123, 456)

// POST /organizations/acme/projects/website/deploy
const deployment = await client.deployProject('acme', 'website', {
  branch: 'main',
  environment: 'production'
})
```

## Error Handling

### Error Modes

#### Throw Mode (Default)

```ts
const client = defineClient(API, {
  errorMode: 'throw' // Default
})

try {
  const user = await client.getUser(999)
} catch (error) {
  if (error.status === 404) {
    console.log('User not found')
  } else if (error.status === 500) {
    console.log('Server error')
  }
}
```

#### Return Mode

```ts
const client = defineClient(API, {
  errorMode: 'return'
})

const result = await client.getUser(999)
if (result.error) {
  console.log('Error:', result.error.message)
} else {
  console.log('User:', result.data)
}
```

### Error Types

```ts
import { HTTPError, TimeoutError, RequestError } from '@alien-rpc/client'

try {
  await client.getUser(123)
} catch (error) {
  if (error instanceof HTTPError) {
    // HTTP error response (4xx, 5xx)
    console.log('Status:', error.status)
    console.log('Message:', error.message)
    console.log('Response:', error.response)
  } else if (error instanceof TimeoutError) {
    // Request timeout
    console.log('Request timed out')
  } else if (error instanceof RequestError) {
    // Network or other request error
    console.log('Request failed:', error.message)
  }
}
```

### Custom Error Handling

```ts
const client = defineClient(API, {
  hooks: {
    beforeError: [
      (error) => {
        // Log all errors
        console.error('API Error:', {
          url: error.request?.url,
          status: error.response?.status,
          message: error.message
        })
        
        // Transform specific errors
        if (error.response?.status === 401) {
          // Redirect to login
          window.location.href = '/login'
          return new Error('Authentication required')
        }
        
        return error
      }
    ]
  }
})
```

## Request Hooks

### Before Request

```ts
const client = defineClient(API, {
  hooks: {
    beforeRequest: [
      // Add authentication
      (request) => {
        const token = localStorage.getItem('auth_token')
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      },
      
      // Add request ID
      (request) => {
        request.headers.set('X-Request-ID', crypto.randomUUID())
      },
      
      // Log requests in development
      (request) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('→', request.method, request.url)
        }
      }
    ]
  }
})
```

### After Response

```ts
const client = defineClient(API, {
  hooks: {
    afterResponse: [
      // Log responses
      (request, options, response) => {
        console.log('←', response.status, request.url)
        return response
      },
      
      // Handle rate limiting
      async (request, options, response) => {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          if (retryAfter) {
            await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000))
            // Retry the request
            return fetch(request)
          }
        }
        return response
      },
      
      // Cache responses
      (request, options, response) => {
        if (request.method === 'GET' && response.ok) {
          cache.set(request.url, response.clone())
        }
        return response
      }
    ]
  }
})
```

## Streaming Responses

### JSON Streaming

```ts
// Server route that streams data
export const streamPosts = route.get('/posts/stream', async function* () {
  for await (const post of db.posts.findMany()) {
    yield post
  }
})

// Client usage
for await (const post of client.streamPosts()) {
  console.log('Received post:', post.title)
  // Process each post as it arrives
}
```

### Handling Stream Errors

```ts
try {
  for await (const item of client.streamData()) {
    console.log('Item:', item)
  }
} catch (error) {
  if (error.name === 'StreamError') {
    console.log('Stream error at item:', error.itemIndex)
    console.log('Error details:', error.cause)
  }
}
```

### Stream with Progress

```ts
let itemCount = 0
for await (const item of client.streamLargeDataset()) {
  itemCount++
  if (itemCount % 100 === 0) {
    console.log(`Processed ${itemCount} items...`)
  }
  processItem(item)
}
console.log(`Finished processing ${itemCount} items`)
```

## Client Extensions

### Extending Clients

```ts
// Base client
const baseClient = defineClient(API, {
  prefixUrl: 'https://api.example.com'
})

// Extended client with authentication
const authClient = baseClient.extend({
  headers: {
    'Authorization': `Bearer ${token}`
  },
  hooks: {
    beforeRequest: [
      (request) => {
        // Refresh token if needed
        if (isTokenExpired(token)) {
          token = refreshToken()
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      }
    ]
  }
})

// Admin client with different base URL
const adminClient = authClient.extend({
  prefixUrl: 'https://admin-api.example.com'
})
```

### Custom Methods

```ts
class APIClient {
  private client: ReturnType<typeof defineClient>
  
  constructor(options: ClientOptions) {
    this.client = defineClient(API, options)
  }
  
  // Wrapper methods with additional logic
  async getUserWithCache(id: number) {
    const cached = cache.get(`user:${id}`)
    if (cached) return cached
    
    const user = await this.client.getUser(id)
    cache.set(`user:${id}`, user, { ttl: 300 })
    return user
  }
  
  // Batch operations
  async createUsers(users: UserCreateData[]) {
    const results = await Promise.allSettled(
      users.map(user => this.client.createUser(user))
    )
    
    return {
      successful: results.filter(r => r.status === 'fulfilled').map(r => r.value),
      failed: results.filter(r => r.status === 'rejected').map(r => r.reason)
    }
  }
  
  // Delegate to original client
  get original() {
    return this.client
  }
}

const api = new APIClient({
  prefixUrl: 'https://api.example.com'
})
```

## WebSocket Support

### Basic WebSocket Usage

```ts
const client = defineClient(API, {
  prefixUrl: 'https://api.example.com',
  ws: {
    url: 'wss://api.example.com/ws'
  }
})

// WebSocket routes work like regular methods
await client.subscribeToUpdates({
  userId: 123,
  events: ['user.updated', 'user.deleted']
})

// Listen for messages
client.on('user.updated', (data) => {
  console.log('User updated:', data)
})

// Send notifications
await client.notifyUser(456, {
  type: 'message',
  content: 'Hello!'
})
```

### WebSocket Configuration

```ts
const client = defineClient(API, {
  ws: {
    url: 'wss://api.example.com/ws',
    
    // Connection options
    protocols: ['alien-rpc-v1'],
    
    // Automatic reconnection
    reconnect: true,
    maxReconnectAttempts: 10,
    reconnectInterval: 1000,
    
    // Connection hooks
    onOpen: () => console.log('WebSocket connected'),
    onClose: () => console.log('WebSocket disconnected'),
    onError: (error) => console.error('WebSocket error:', error),
    
    // Message handling
    onMessage: (data) => console.log('Received:', data)
  }
})
```

## Testing

### Mock Client

```ts
import { createMockClient } from '@alien-rpc/client/testing'
import * as API from './generated/api.js'

// Create mock client
const mockClient = createMockClient(API)

// Mock specific routes
mockClient.getUser.mockResolvedValue({
  id: 123,
  name: 'John Doe',
  email: 'john@example.com'
})

mockClient.createUser.mockImplementation(async (data) => {
  return {
    id: Math.random(),
    ...data,
    createdAt: new Date()
  }
})

// Use in tests
const user = await mockClient.getUser(123)
expect(user.name).toBe('John Doe')
```

### Test Client with Real Server

```ts
import { defineClient } from '@alien-rpc/client'
import * as API from './generated/api.js'

// Test against local server
const testClient = defineClient(API, {
  prefixUrl: 'http://localhost:3001',
  timeout: 5000
})

describe('API Integration', () => {
  it('should create and retrieve user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com'
    }
    
    const createdUser = await testClient.createUser(userData)
    expect(createdUser.id).toBeDefined()
    
    const retrievedUser = await testClient.getUser(createdUser.id)
    expect(retrievedUser.name).toBe(userData.name)
  })
})
```

## Performance Optimization

### Request Deduplication

```ts
class DeduplicatedClient {
  private client: ReturnType<typeof defineClient>
  private pendingRequests = new Map<string, Promise<any>>()
  
  constructor(options: ClientOptions) {
    this.client = defineClient(API, options)
  }
  
  async getUser(id: number) {
    const key = `getUser:${id}`
    
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)
    }
    
    const promise = this.client.getUser(id).finally(() => {
      this.pendingRequests.delete(key)
    })
    
    this.pendingRequests.set(key, promise)
    return promise
  }
}
```

### Response Caching

```ts
const client = defineClient(API, {
  hooks: {
    beforeRequest: [
      async (request) => {
        // Check cache for GET requests
        if (request.method === 'GET') {
          const cached = await cache.get(request.url)
          if (cached) {
            // Return cached response
            return new Response(JSON.stringify(cached), {
              headers: { 'Content-Type': 'application/json' }
            })
          }
        }
      }
    ],
    afterResponse: [
      async (request, options, response) => {
        // Cache successful GET responses
        if (request.method === 'GET' && response.ok) {
          const data = await response.clone().json()
          await cache.set(request.url, data, { ttl: 300 })
        }
        return response
      }
    ]
  }
})
```

### Request Batching

```ts
class BatchingClient {
  private client: ReturnType<typeof defineClient>
  private batchQueue: Array<{ method: string; args: any[]; resolve: Function; reject: Function }> = []
  private batchTimer: NodeJS.Timeout | null = null
  
  constructor(options: ClientOptions) {
    this.client = defineClient(API, options)
  }
  
  async getUser(id: number): Promise<User> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ method: 'getUser', args: [id], resolve, reject })
      
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), 10)
      }
    })
  }
  
  private async processBatch() {
    const batch = this.batchQueue.splice(0)
    this.batchTimer = null
    
    // Group by method
    const groups = batch.reduce((acc, item) => {
      if (!acc[item.method]) acc[item.method] = []
      acc[item.method].push(item)
      return acc
    }, {} as Record<string, typeof batch>)
    
    // Process each group
    for (const [method, items] of Object.entries(groups)) {
      try {
        if (method === 'getUser') {
          const ids = items.map(item => item.args[0])
          const users = await this.client.getUsersBatch(ids)
          
          items.forEach((item, index) => {
            item.resolve(users[index])
          })
        }
      } catch (error) {
        items.forEach(item => item.reject(error))
      }
    }
  }
}
```

## Best Practices

### 1. Client Configuration

```ts
// Good: Centralized client configuration
const createAPIClient = (options: Partial<ClientOptions> = {}) => {
  return defineClient(API, {
    prefixUrl: process.env.API_URL || 'https://api.example.com',
    timeout: 30000,
    retry: { limit: 3 },
    headers: {
      'X-Client-Version': process.env.APP_VERSION || '1.0.0'
    },
    ...options
  })
}

// Use throughout app
const client = createAPIClient()
```

### 2. Error Handling

```ts
// Good: Consistent error handling
const handleAPIError = (error: unknown) => {
  if (error instanceof HTTPError) {
    switch (error.status) {
      case 401:
        redirectToLogin()
        break
      case 403:
        showErrorMessage('Access denied')
        break
      case 404:
        showErrorMessage('Resource not found')
        break
      default:
        showErrorMessage('An error occurred')
    }
  } else {
    showErrorMessage('Network error')
  }
}

// Use in components
try {
  const user = await client.getUser(id)
} catch (error) {
  handleAPIError(error)
}
```

### 3. Type Safety

```ts
// Good: Leverage TypeScript for safety
const updateUser = async (id: number, updates: Partial<User>) => {
  // TypeScript ensures updates match User type
  return await client.updateUser(id, updates)
}

// Good: Use generated types
import type { User, CreateUserData } from './generated/api.js'

const createUser = async (data: CreateUserData): Promise<User> => {
  return await client.createUser(data)
}
```

### 4. Resource Management

```ts
// Good: Proper cleanup
class APIService {
  private client: ReturnType<typeof defineClient>
  private abortController = new AbortController()
  
  constructor() {
    this.client = defineClient(API, {
      signal: this.abortController.signal
    })
  }
  
  async getUser(id: number) {
    return await this.client.getUser(id)
  }
  
  destroy() {
    this.abortController.abort()
  }
}
```

---

**Next**: [Streaming →](./streaming.md) | **Previous**: [Validation ←](./validation.md)