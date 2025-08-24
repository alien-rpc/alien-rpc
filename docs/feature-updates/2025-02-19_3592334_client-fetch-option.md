# Client Fetch Option Implementation

**Commit:** 35923344e2a773688923e76cd30babffd4b9a208
**Author:** Alec Larson
**Date:** 2025-02-19
**Short SHA:** 3592334

## Summary

This commit implements the `fetch` option for the alien-rpc client, allowing users to override the default `globalThis.fetch` function. This feature was previously available in the ky HTTP client library but was lost when alien-rpc dropped the ky dependency. The implementation provides a clean way to customize HTTP request handling for testing, authentication, logging, and other advanced use cases.

## User Impact

**Audience:** Developers needing custom HTTP request handling, testing, or advanced client configuration
**Breaking Change:** No - additive enhancement
**Migration Required:** No - existing code continues to work
**Status:** Stable - restores functionality from ky era

## Key Changes

### Fetch Option Addition

**Client Options Interface:**

```ts
export interface ClientOptions<TErrorMode extends ErrorMode = ErrorMode> {
  // ... existing options

  /**
   * Override the `globalThis.fetch` function that sends requests. Useful
   * for testing purposes, mostly.
   */
  fetch?: (request: Request) => Promise<Response>
}
```

### Implementation in createFetchFunction

**Before:**

```ts
function createFetchFunction(client: Client): Fetch {
  const { prefixUrl = location.origin } = client.options

  const tryRequest = async (
    request: Request,
    shouldRetry: ShouldRetryFunction,
    timeout: number
  ) => {
    // ... request logic using globalThis.fetch
    response = await fetch(request)
    // ...
  }
}
```

**After:**

```ts
function createFetchFunction(client: Client): Fetch {
  const { prefixUrl = location.origin, fetch = globalThis.fetch } =
    client.options

  const tryRequest = async (
    request: Request,
    shouldRetry: ShouldRetryFunction,
    timeout: number
  ) => {
    // ... request logic using custom or default fetch
    response = await fetch(request)
    // ...
  }
}
```

## Use Cases

### Testing with Mock Responses

```ts
import { defineClient } from '@alien-rpc/client'
import * as routes from './routes'

// Mock fetch for testing
const mockFetch = async (request: Request): Promise<Response> => {
  const url = new URL(request.url)

  // Mock different endpoints
  if (url.pathname === '/api/users/123') {
    return new Response(JSON.stringify({ id: 123, name: 'John Doe' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (url.pathname === '/api/posts') {
    return new Response(JSON.stringify([{ id: 1, title: 'Test Post' }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Default 404 response
  return new Response('Not Found', { status: 404 })
}

// Create client with mock fetch
const testClient = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  fetch: mockFetch,
})

// Use in tests
const user = await testClient.getUser({ id: '123' })
expect(user.name).toBe('John Doe')
```

### Request/Response Logging

```ts
const loggingFetch = async (request: Request): Promise<Response> => {
  const startTime = Date.now()

  // Log request
  console.log(`→ ${request.method} ${request.url}`, {
    headers: Object.fromEntries(request.headers.entries()),
    body: request.body ? await request.clone().text() : null,
  })

  try {
    const response = await globalThis.fetch(request)
    const duration = Date.now() - startTime

    // Log response
    console.log(`← ${response.status} ${response.statusText} (${duration}ms)`, {
      headers: Object.fromEntries(response.headers.entries()),
      body: response.headers.get('content-type')?.includes('json')
        ? await response.clone().json()
        : null,
    })

    return response
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`✗ Request failed (${duration}ms):`, error)
    throw error
  }
}

const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  fetch: loggingFetch,
})
```

### Authentication Token Injection

```ts
let authToken: string | null = null

const authenticatedFetch = async (request: Request): Promise<Response> => {
  // Clone request to modify headers
  const authenticatedRequest = new Request(request, {
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
    },
  })

  const response = await globalThis.fetch(authenticatedRequest)

  // Handle token refresh on 401
  if (response.status === 401 && authToken) {
    try {
      authToken = await refreshAuthToken()

      // Retry with new token
      const retryRequest = new Request(request, {
        headers: {
          ...Object.fromEntries(request.headers.entries()),
          Authorization: `Bearer ${authToken}`,
        },
      })

      return await globalThis.fetch(retryRequest)
    } catch (refreshError) {
      // Token refresh failed, clear token
      authToken = null
      throw refreshError
    }
  }

  return response
}

const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  fetch: authenticatedFetch,
})

// Set token after login
const login = async (credentials: LoginCredentials) => {
  const response = await client.login(credentials)
  authToken = response.token
  return response
}
```

### Request Caching

```ts
interface CacheEntry {
  response: Response
  timestamp: number
  ttl: number
}

const cache = new Map<string, CacheEntry>()

const cachingFetch = async (request: Request): Promise<Response> => {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return globalThis.fetch(request)
  }

  const cacheKey = request.url
  const cached = cache.get(cacheKey)

  // Return cached response if valid
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    console.log(`Cache hit: ${request.url}`)
    return cached.response.clone()
  }

  // Fetch and cache response
  const response = await globalThis.fetch(request)

  if (response.ok) {
    // Cache successful responses for 5 minutes
    cache.set(cacheKey, {
      response: response.clone(),
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000,
    })

    console.log(`Cached: ${request.url}`)
  }

  return response
}

const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  fetch: cachingFetch,
})
```

### Network Simulation for Development

```ts
const simulateNetworkConditions = ({
  latency = 0,
  failureRate = 0,
  slowConnection = false,
} = {}) => {
  return async (request: Request): Promise<Response> => {
    // Simulate network latency
    if (latency > 0) {
      await new Promise(resolve => setTimeout(resolve, latency))
    }

    // Simulate random failures
    if (failureRate > 0 && Math.random() < failureRate) {
      throw new Error('Simulated network failure')
    }

    // Simulate slow connection
    if (slowConnection) {
      const response = await globalThis.fetch(request)
      const reader = response.body?.getReader()

      if (reader) {
        // Create a slow stream
        const stream = new ReadableStream({
          start(controller) {
            const pump = async () => {
              const { done, value } = await reader.read()

              if (done) {
                controller.close()
                return
              }

              // Add delay between chunks
              await new Promise(resolve => setTimeout(resolve, 100))
              controller.enqueue(value)
              pump()
            }
            pump()
          },
        })

        return new Response(stream, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })
      }
    }

    return globalThis.fetch(request)
  }
}

// Development client with network simulation
const devClient = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  fetch: simulateNetworkConditions({
    latency: 200, // 200ms latency
    failureRate: 0.1, // 10% failure rate
    slowConnection: true,
  }),
})
```

## Testing Integration

### Jest Mock Implementation

```ts
// __mocks__/api-client.ts
import { defineClient } from '@alien-rpc/client'
import * as routes from '../src/routes'

const mockResponses = new Map<string, any>()

export const mockFetch = jest.fn(
  async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const key = `${request.method} ${url.pathname}`

    const mockData = mockResponses.get(key)
    if (mockData) {
      if (mockData instanceof Error) {
        throw mockData
      }

      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Not Found', { status: 404 })
  }
)

export const setMockResponse = (method: string, path: string, data: any) => {
  mockResponses.set(`${method} ${path}`, data)
}

export const clearMockResponses = () => {
  mockResponses.clear()
  mockFetch.mockClear()
}

export const testClient = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  fetch: mockFetch,
})
```

### Test Usage

```ts
// user.test.ts
import {
  testClient,
  setMockResponse,
  clearMockResponses,
} from './__mocks__/api-client'

describe('User API', () => {
  beforeEach(() => {
    clearMockResponses()
  })

  it('should fetch user data', async () => {
    setMockResponse('GET', '/api/users/123', {
      id: 123,
      name: 'John Doe',
      email: 'john@example.com',
    })

    const user = await testClient.getUser({ id: '123' })

    expect(user.id).toBe(123)
    expect(user.name).toBe('John Doe')
  })

  it('should handle user not found', async () => {
    setMockResponse('GET', '/api/users/999', new Error('User not found'))

    await expect(testClient.getUser({ id: '999' })).rejects.toThrow(
      'User not found'
    )
  })
})
```

## Implementation Details

### Type Safety

```ts
// The fetch option is properly typed
interface ClientOptions {
  fetch?: (request: Request) => Promise<Response>
}

// Ensures compatibility with standard Fetch API
type FetchFunction = typeof globalThis.fetch
```

### Default Behavior

```ts
// Uses globalThis.fetch by default
const { fetch = globalThis.fetch } = client.options

// Maintains all existing functionality when not specified
const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  // fetch defaults to globalThis.fetch
})
```

### Integration with Existing Features

```ts
// Custom fetch works with all existing client features
const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  fetch: customFetch,
  retry: 3, // Retry logic still works
  timeout: 30, // Timeout handling still works
  headers: { 'X-API-Key': 'key' }, // Default headers still work
  hooks: {
    // Hooks still work
    afterResponse: [
      response => {
        console.log('Response received:', response.status)
      },
    ],
  },
})
```

## Benefits

### Testing Flexibility

- **Mock Responses**: Easy mocking for unit and integration tests
- **Network Simulation**: Simulate various network conditions
- **Error Testing**: Test error handling scenarios
- **Isolation**: Test without making real HTTP requests

### Development Experience

- **Debugging**: Add logging and debugging capabilities
- **Development Tools**: Integrate with development proxies
- **Performance Monitoring**: Add timing and performance metrics
- **Request Modification**: Modify requests for development needs

### Production Features

- **Authentication**: Implement complex authentication flows
- **Caching**: Add client-side caching strategies
- **Retry Logic**: Implement custom retry mechanisms
- **Request Transformation**: Transform requests and responses

### Compatibility

- **Ky Migration**: Restores functionality lost when dropping ky
- **Standard API**: Uses standard Fetch API interface
- **Framework Agnostic**: Works with any testing framework
- **Environment Support**: Works in browsers, Node.js, and other environments

## Migration from ky

### Before (with ky)

```ts
import ky from 'ky'

const api = ky.create({
  prefixUrl: 'https://api.example.com',
  hooks: {
    beforeRequest: [
      request => {
        // Custom request handling
      },
    ],
  },
})
```

### After (with alien-rpc)

```ts
import { defineClient } from '@alien-rpc/client'

const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  fetch: async request => {
    // Custom request handling (equivalent to beforeRequest hook)
    return globalThis.fetch(request)
  },
})
```

## Performance Impact

### Runtime Performance

- **Zero Overhead**: When not specified, uses globalThis.fetch directly
- **Minimal Overhead**: When specified, adds single function call
- **Same Network Performance**: Network requests perform identically
- **Memory Efficient**: No additional memory allocation for default case

### Bundle Size

- **No Increase**: Feature adds no additional bundle size
- **Optional**: Only used when explicitly configured
- **Tree Shakeable**: Unused code paths are eliminated

## Security Considerations

### Request Modification

```ts
// Be careful when modifying requests
const safeFetch = async (request: Request): Promise<Response> => {
  // Validate request before modification
  if (!isValidRequest(request)) {
    throw new Error('Invalid request')
  }

  // Safely modify request
  const modifiedRequest = new Request(request, {
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      'X-Client-Version': '1.0.0',
    },
  })

  return globalThis.fetch(modifiedRequest)
}
```

### Sensitive Data Handling

```ts
// Avoid logging sensitive information
const secureLoggingFetch = async (request: Request): Promise<Response> => {
  const safeHeaders = Object.fromEntries(
    Array.from(request.headers.entries()).filter(
      ([key]) => !key.toLowerCase().includes('authorization')
    )
  )

  console.log(`Request: ${request.method} ${request.url}`, {
    headers: safeHeaders, // Don't log authorization headers
  })

  return globalThis.fetch(request)
}
```

## Related Changes

- **Commit 9287eea**: Removed ky dependency, making custom fetch necessary
- **Previous ky integration**: This feature restores ky's custom fetch capability
- **Client architecture**: Part of the custom HTTP client implementation

## Future Enhancements

**Planned Features:**

- Built-in request/response interceptors
- Middleware system for common patterns
- Plugin architecture for extensibility

**Potential Improvements:**

- Request/response transformation utilities
- Built-in caching strategies
- Authentication helpers
- Development tools integration

## Conclusion

The `fetch` option implementation provides a powerful and flexible way to customize HTTP request handling in alien-rpc clients. It restores functionality that was available with ky while maintaining the benefits of the custom HTTP client implementation. The feature enables advanced use cases like testing, authentication, logging, and caching while maintaining backward compatibility and zero overhead for users who don't need custom fetch behavior.
