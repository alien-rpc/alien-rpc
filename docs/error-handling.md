# Error Handling

Alien RPC provides comprehensive error handling capabilities, including HTTP status code mapping, custom error types, and flexible error modes for different application needs.

## HTTP Errors

### Overview

Routes can throw intentional errors that automatically map to appropriate HTTP status codes. This provides a clean way to handle common error scenarios while maintaining type safety.

### Basic Error Throwing

```typescript
import { route, UnauthorizedError, NotFoundError } from '@alien-rpc/service'

export const getUser = route.get('/users/:id', async (args: { id: string }) => {
  const user = await db.users.findById(args.id)
  
  if (!user) {
    throw new NotFoundError('User not found')
  }
  
  return user
})

export const getProfile = route.get('/profile', async (args, context) => {
  if (!context.user) {
    throw new UnauthorizedError('Authentication required')
  }
  
  return context.user.profile
})
```

### Available HTTP Error Classes

Alien RPC provides error classes for all standard HTTP error status codes:

#### Client Errors (4xx)

```typescript
import {
  BadRequestError,        // 400
  UnauthorizedError,      // 401
  PaymentRequiredError,   // 402
  ForbiddenError,         // 403
  NotFoundError,          // 404
  MethodNotAllowedError,  // 405
  NotAcceptableError,     // 406
  ConflictError,          // 409
  GoneError,              // 410
  UnprocessableEntityError, // 422
  TooManyRequestsError,   // 429
} from '@alien-rpc/service'

// Usage examples
export const createUser = route.post('/users', async (data: CreateUserData) => {
  if (!data.email) {
    throw new BadRequestError('Email is required')
  }
  
  const existing = await db.users.findByEmail(data.email)
  if (existing) {
    throw new ConflictError('User with this email already exists')
  }
  
  return await db.users.create(data)
})

export const deleteUser = route.delete('/users/:id', async (args: { id: string }, context) => {
  if (!context.user?.isAdmin) {
    throw new ForbiddenError('Admin access required')
  }
  
  const user = await db.users.findById(args.id)
  if (!user) {
    throw new NotFoundError('User not found')
  }
  
  await db.users.delete(args.id)
  return { success: true }
})
```

#### Server Errors (5xx)

```typescript
import {
  InternalServerError,    // 500
  NotImplementedError,    // 501
  BadGatewayError,        // 502
  ServiceUnavailableError, // 503
  GatewayTimeoutError,    // 504
} from '@alien-rpc/service'

export const processPayment = route.post('/payments', async (data: PaymentData) => {
  try {
    const result = await paymentService.process(data)
    return result
  } catch (error) {
    if (error.code === 'SERVICE_UNAVAILABLE') {
      throw new ServiceUnavailableError('Payment service is temporarily unavailable')
    }
    
    if (error.code === 'TIMEOUT') {
      throw new GatewayTimeoutError('Payment processing timed out')
    }
    
    throw new InternalServerError('Payment processing failed')
  }
})
```

### Custom Error Messages

```typescript
export const validateInput = route.post('/validate', async (data: any) => {
  const errors = []
  
  if (!data.name) errors.push('Name is required')
  if (!data.email) errors.push('Email is required')
  if (data.age && data.age < 18) errors.push('Must be 18 or older')
  
  if (errors.length > 0) {
    throw new BadRequestError(`Validation failed: ${errors.join(', ')}`)
  }
  
  return { valid: true }
})
```

### Error with Additional Data

```typescript
export const uploadFile = route.post('/upload', async (data: { file: File }) => {
  const maxSize = 10 * 1024 * 1024 // 10MB
  
  if (data.file.size > maxSize) {
    const error = new BadRequestError('File too large')
    // Add additional context (this will be included in the error response)
    error.details = {
      maxSize,
      actualSize: data.file.size,
      filename: data.file.name
    }
    throw error
  }
  
  return await processFile(data.file)
})
```

## Client Error Modes

### Overview

Alien RPC clients support two error handling modes:

1. **Throw Mode** (default) - Errors are thrown as exceptions
2. **Return Mode** - Errors are returned as part of the response object

### Throw Mode (Default)

```typescript
import { createClient } from './generated/client'

const client = createClient({
  prefixUrl: 'http://localhost:3000',
  errorMode: 'throw' // This is the default
})

try {
  const user = await client.getUser({ id: '123' })
  console.log('User:', user)
} catch (error) {
  if (error instanceof HTTPError) {
    console.error(`HTTP ${error.response.status}: ${error.message}`)
    
    // Access response details
    console.error('Response body:', await error.response.text())
  } else {
    console.error('Network or other error:', error)
  }
}
```

### Return Mode

```typescript
const client = createClient({
  prefixUrl: 'http://localhost:3000',
  errorMode: 'return'
})

const result = await client.getUser({ id: '123' })

if (result.error) {
  console.error('Error:', result.error.message)
  console.error('Status:', result.error.status)
} else {
  console.log('User:', result.data)
}
```

### Per-Request Error Mode

```typescript
// Override global error mode for specific requests
const client = createClient({ prefixUrl: 'http://localhost:3000' })

// Use return mode for this specific call
const result = await client.getUser({ id: '123' }, { errorMode: 'return' })

if (result.error) {
  // Handle error
} else {
  // Use result.data
}
```

## Error Types

### HTTPError

Thrown when the server returns an HTTP error status (4xx or 5xx):

```typescript
import { HTTPError } from '@alien-rpc/client'

try {
  await client.getUser({ id: '123' })
} catch (error) {
  if (error instanceof HTTPError) {
    console.log('Status:', error.response.status)
    console.log('Status text:', error.response.statusText)
    console.log('Message:', error.message)
    
    // Access the full response
    const body = await error.response.json()
    console.log('Error details:', body)
  }
}
```

### TimeoutError

Thrown when a request times out:

```typescript
import { TimeoutError } from '@alien-rpc/client'

const client = createClient({
  prefixUrl: 'http://localhost:3000',
  timeout: 5000 // 5 seconds
})

try {
  await client.slowOperation()
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Request timed out after 5 seconds')
  }
}
```

### RequestError

Thrown for network errors or other request failures:

```typescript
import { RequestError } from '@alien-rpc/client'

try {
  await client.getUser({ id: '123' })
} catch (error) {
  if (error instanceof RequestError) {
    console.error('Network error:', error.message)
    console.error('Cause:', error.cause)
  }
}
```

## Advanced Error Handling

### Global Error Handling with Hooks

```typescript
const client = createClient({
  prefixUrl: 'http://localhost:3000',
  hooks: {
    afterResponse: [
      async (request, options, response) => {
        // Log all errors
        if (!response.ok) {
          console.error(`Request failed: ${request.method} ${request.url}`, {
            status: response.status,
            statusText: response.statusText
          })
        }
        
        return response
      }
    ],
    
    beforeError: [
      async (error) => {
        // Transform or log errors before they're thrown
        if (error instanceof HTTPError && error.response.status === 401) {
          // Handle authentication errors globally
          await redirectToLogin()
        }
        
        return error
      }
    ]
  }
})
```

### Retry Logic

```typescript
const client = createClient({
  prefixUrl: 'http://localhost:3000',
  retry: {
    limit: 3,
    methods: ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE'],
    statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
    errorCodes: ['ETIMEDOUT', 'ECONNRESET', 'EADDRINUSE', 'ECONNREFUSED']
  }
})

// This will automatically retry on transient failures
try {
  const result = await client.unreliableEndpoint()
} catch (error) {
  // Only thrown after all retries are exhausted
  console.error('Failed after retries:', error)
}
```

### Custom Error Handling

```typescript
class CustomAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'CustomAPIError'
  }
}

const client = createClient({
  prefixUrl: 'http://localhost:3000',
  hooks: {
    beforeError: [
      async (error) => {
        if (error instanceof HTTPError) {
          const body = await error.response.json()
          
          // Transform HTTP errors to custom errors
          return new CustomAPIError(
            body.message || error.message,
            error.response.status,
            body.code || 'UNKNOWN',
            body.details
          )
        }
        
        return error
      }
    ]
  }
})
```

## Error Handling in Streaming

### JSON Streaming Errors

```typescript
// Server-side error handling in streams
export const streamWithErrors = route.get('/stream', async function* () {
  try {
    for (let i = 0; i < 100; i++) {
      if (i === 50) {
        throw new Error('Simulated error')
      }
      yield { count: i }
    }
  } catch (error) {
    // Send error as part of the stream
    yield { error: error.message, recoverable: true }
    
    // Continue streaming if error is recoverable
    for (let i = 51; i < 100; i++) {
      yield { count: i }
    }
  }
})

// Client-side error handling
try {
  for await (const item of client.streamWithErrors()) {
    if ('error' in item) {
      console.error('Stream error:', item.error)
      if (!item.recoverable) {
        break
      }
    } else {
      console.log('Item:', item)
    }
  }
} catch (error) {
  console.error('Stream failed:', error)
}
```

### WebSocket Error Handling

```typescript
// Server-side WebSocket error handling
export const chatSocket = route.ws('/chat', {
  async onMessage(message: { text: string }) {
    try {
      await processMessage(message)
    } catch (error) {
      // Send error back to client
      throw new BadRequestError(`Message processing failed: ${error.message}`)
    }
  },
  
  async onRequest(request: { action: string }) {
    if (request.action === 'invalid') {
      throw new BadRequestError('Invalid action')
    }
    
    return { success: true }
  }
})

// Client-side WebSocket error handling
const ws = await client.chatSocket()

ws.on('error', (error) => {
  console.error('WebSocket error:', error)
})

try {
  const response = await ws.request({ action: 'invalid' })
} catch (error) {
  console.error('Request failed:', error.message)
}
```

## Testing Error Scenarios

### Testing Route Errors

```typescript
import { describe, it, expect } from 'vitest'
import { createTestClient } from './test-utils'
import { NotFoundError, UnauthorizedError } from '@alien-rpc/service'

describe('Error Handling', () => {
  it('should throw NotFoundError for missing user', async () => {
    const client = createTestClient()
    
    await expect(client.getUser({ id: 'nonexistent' }))
      .rejects
      .toThrow(NotFoundError)
  })
  
  it('should handle validation errors', async () => {
    const client = createTestClient()
    
    try {
      await client.createUser({ email: '' })
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestError)
      expect(error.message).toContain('Email is required')
    }
  })
})
```

### Testing Client Error Modes

```typescript
describe('Client Error Modes', () => {
  it('should throw errors in throw mode', async () => {
    const client = createTestClient({ errorMode: 'throw' })
    
    await expect(client.getUser({ id: 'nonexistent' }))
      .rejects
      .toThrow()
  })
  
  it('should return errors in return mode', async () => {
    const client = createTestClient({ errorMode: 'return' })
    
    const result = await client.getUser({ id: 'nonexistent' })
    
    expect(result.error).toBeDefined()
    expect(result.error.status).toBe(404)
    expect(result.data).toBeUndefined()
  })
})
```

## Best Practices

### Server-Side Error Handling

1. **Use appropriate HTTP status codes** - Choose the most specific error class
2. **Provide helpful error messages** - Include context about what went wrong
3. **Don't expose sensitive information** - Avoid leaking internal details
4. **Log errors appropriately** - Help with debugging without overwhelming logs
5. **Handle errors consistently** - Use the same patterns across your API

```typescript
// Good: Specific error with helpful message
if (!user.isActive) {
  throw new ForbiddenError('Account is deactivated. Please contact support.')
}

// Bad: Generic error with no context
if (!user.isActive) {
  throw new Error('Error')
}
```

### Client-Side Error Handling

1. **Choose the right error mode** - Throw mode for most cases, return mode for complex flows
2. **Handle specific error types** - Different errors may need different handling
3. **Implement retry logic** - For transient failures
4. **Provide user feedback** - Show meaningful messages to users
5. **Log errors for debugging** - But don't overwhelm users with technical details

```typescript
// Good: Specific error handling
try {
  const user = await client.getUser({ id })
  return user
} catch (error) {
  if (error instanceof HTTPError) {
    if (error.response.status === 404) {
      showMessage('User not found')
    } else if (error.response.status === 401) {
      redirectToLogin()
    } else {
      showMessage('Something went wrong. Please try again.')
    }
  } else {
    showMessage('Network error. Please check your connection.')
  }
  
  console.error('API error:', error)
}
```

### Error Recovery

1. **Implement graceful degradation** - Provide fallback functionality
2. **Use circuit breakers** - Prevent cascading failures
3. **Cache responses** - Serve stale data when services are down
4. **Implement health checks** - Monitor service availability
5. **Plan for partial failures** - Handle scenarios where some operations succeed

```typescript
// Example: Graceful degradation
async function getUserProfile(id: string) {
  try {
    return await client.getUser({ id })
  } catch (error) {
    if (error instanceof HTTPError && error.response.status === 503) {
      // Service unavailable, return cached data
      return getCachedUser(id)
    }
    throw error
  }
}
```

Proper error handling is crucial for building robust applications. Alien RPC's error handling features help you create APIs that fail gracefully and clients that handle errors appropriately, leading to better user experiences and easier debugging.