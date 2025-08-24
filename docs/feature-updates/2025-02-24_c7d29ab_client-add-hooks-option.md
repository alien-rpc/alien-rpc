# Client Add Hooks Option (Inspired by ky)

**Commit:** c7d29abcd647d990ba3e6c08ac0832dea30c7e9d
**Author:** Alec Larson
**Date:** Mon Feb 24 11:40:32 2025 -0500
**Short SHA:** c7d29ab

## Summary

This commit introduces a hooks system to the alien-rpc client, inspired by the popular ky HTTP client library. The implementation provides `beforeError` and `afterResponse` hooks that allow developers to intercept and modify requests and responses at key points in the request lifecycle.

## User Impact

**Audience:** Frontend developers using alien-rpc client for API calls
**Breaking Change:** No - purely additive feature
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### New Hook Types and Interfaces

```ts
// In packages/client/src/types.ts
export interface BeforeErrorHook {
  (context: { request: Request; response: Response; error: Error }): 
    Error | Promise<Error>
}

export interface AfterResponseHook {
  (context: { request: Request; response: Response }): 
    Response | void | Promise<Response | void>
}

export interface RequestHooks {
  beforeError?: BeforeErrorHook | BeforeErrorHook[]
  afterResponse?: AfterResponseHook | AfterResponseHook[]
}

export interface RequestHookByName {
  beforeError: BeforeErrorHook[]
  afterResponse: AfterResponseHook[]
}
```

### Enhanced Client Options

**Before:**
```ts
// In packages/client/src/types.ts
export interface ClientOptions {
  prefixUrl?: string
  fetch?: Fetch
  retry?: RetryOptions
  headers?: HeadersInit
  errorMode?: ErrorMode
}
```

**After:**
```ts
// In packages/client/src/types.ts
export interface ClientOptions {
  prefixUrl?: string
  fetch?: Fetch
  retry?: RetryOptions
  headers?: HeadersInit
  errorMode?: ErrorMode
  hooks?: RequestHooks | readonly RequestHooks[]  // New hooks option
}
```

### Hook Integration in Request Processing

**Before:**
```ts
// In packages/client/src/client.ts
const tryRequest = async (
  request: Request,
  shouldRetry: ShouldRetryFunction
) => {
  const response = await fetch(request)
  if (response.status >= 400) {
    const retryDelay = shouldRetry(response)
    if (retryDelay !== false) {
      await sleep(retryDelay)
      return tryRequest(request, shouldRetry)
    }
    throw new ResponseError(response)
  }
  return response
}
```

**After:**
```ts
// In packages/client/src/client.ts
const tryRequest = async (
  request: Request,
  shouldRetry: ShouldRetryFunction
) => {
  let response = await fetch(request)
  
  // Execute afterResponse hooks
  for (const afterResponse of iterateHooks(hooks, 'afterResponse')) {
    const newResponse = await afterResponse({ request, response })
    if (newResponse instanceof Response) {
      response = newResponse
    }
  }
  
  if (response.status >= 400) {
    const retryDelay = shouldRetry(response)
    if (retryDelay !== false) {
      await sleep(retryDelay)
      return tryRequest(request, shouldRetry)
    }
    
    let error = new ResponseError(response)
    
    // Execute beforeError hooks
    for (const beforeError of iterateHooks(hooks, 'beforeError')) {
      error = await beforeError({ request, response, error })
    }
    
    throw error
  }
  return response
}
```

## Implementation Details

### Hook Iteration Utility

```ts
// In packages/client/src/utils/callHook.ts
export function* iterateHooks<K extends keyof RequestHookByName>(
  hooksOption: RequestHooks | readonly RequestHooks[] | undefined,
  name: K
): Generator<RequestHookByName[K]> {
  if (!hooksOption) {
    return
  }
  if (isArray(hooksOption)) {
    for (const hooks of hooksOption) {
      if (hooks[name]) {
        yield* castArray(hooks[name]) as RequestHookByName[K][]
      }
    }
  } else if (hooksOption[name]) {
    yield* castArray(hooksOption[name]) as RequestHookByName[K][]
  }
}
```

### Hook Merging Logic

```ts
// In packages/client/src/utils/mergeHooks.ts
export function mergeHooks(
  parentHooks: RequestHooks | readonly RequestHooks[] | undefined,
  hooks: RequestHooks | readonly RequestHooks[] | undefined
) {
  if (hooks && parentHooks) {
    if (isArray(parentHooks)) {
      return parentHooks.concat(hooks)
    }
    if (isArray(hooks)) {
      return [parentHooks, ...hooks]
    }
    return [parentHooks, hooks]
  }
  return hooks ?? parentHooks
}
```

### Options Merging Enhancement

```ts
// In packages/client/src/utils/mergeOptions.ts
export function mergeOptions(
  parentOptions: ClientOptions | undefined,
  options: ClientOptions
): ClientOptions {
  return {
    ...parentOptions,
    ...options,
    hooks: mergeHooks(parentOptions?.hooks, options.hooks),  // New hook merging
    retry: mergeRetryOptions(parentOptions?.retry, options.retry),
    headers: mergeHeaders(parentOptions?.headers, options.headers),
    errorMode: options.errorMode ?? parentOptions?.errorMode ?? 'reject',
  }
}
```

## Usage Examples

### Basic Hook Usage

```ts
import { defineClient } from '@alien-rpc/client'

const client = defineClient({
  prefixUrl: 'https://api.example.com',
  hooks: {
    // Log all responses
    afterResponse: ({ request, response }) => {
      console.log(`${request.method} ${request.url} -> ${response.status}`)
    },
    
    // Transform errors
    beforeError: ({ request, response, error }) => {
      if (response.status === 401) {
        return new Error('Authentication required')
      }
      return error
    }
  }
})
```

### Multiple Hooks

```ts
const client = defineClient({
  prefixUrl: 'https://api.example.com',
  hooks: {
    afterResponse: [
      // Hook 1: Log response time
      ({ request, response }) => {
        const duration = Date.now() - request.metadata?.startTime
        console.log(`Request took ${duration}ms`)
      },
      
      // Hook 2: Cache responses
      ({ request, response }) => {
        if (request.method === 'GET' && response.ok) {
          cache.set(request.url, response.clone())
        }
      }
    ],
    
    beforeError: [
      // Hook 1: Log errors
      ({ request, response, error }) => {
        console.error(`Request failed: ${request.url}`, error)
        return error
      },
      
      // Hook 2: Transform specific errors
      ({ request, response, error }) => {
        if (response.status === 429) {
          return new Error('Rate limit exceeded. Please try again later.')
        }
        return error
      }
    ]
  }
})
```

### Response Transformation

```ts
const client = defineClient({
  prefixUrl: 'https://api.example.com',
  hooks: {
    afterResponse: async ({ request, response }) => {
      // Add custom headers to all responses
      const newResponse = response.clone()
      newResponse.headers.set('X-Processed-By', 'alien-rpc-client')
      newResponse.headers.set('X-Request-Time', new Date().toISOString())
      return newResponse
    }
  }
})

// Usage
const api = client('/api')
const response = await api.users.get()
// response.headers will include the custom headers
```

### Authentication Hook

```ts
let authToken: string | null = null

const client = defineClient({
  prefixUrl: 'https://api.example.com',
  hooks: {
    beforeError: async ({ request, response, error }) => {
      // Handle 401 errors by refreshing token
      if (response.status === 401 && authToken) {
        try {
          authToken = await refreshAuthToken()
          
          // Retry the original request with new token
          const newRequest = request.clone()
          newRequest.headers.set('Authorization', `Bearer ${authToken}`)
          
          const retryResponse = await fetch(newRequest)
          if (retryResponse.ok) {
            // Return the successful response instead of throwing
            return new Error('Request succeeded after token refresh')
          }
        } catch (refreshError) {
          return new Error('Authentication failed: Unable to refresh token')
        }
      }
      
      return error
    }
  }
})
```

### Logging and Analytics

```ts
const client = defineClient({
  prefixUrl: 'https://api.example.com',
  hooks: {
    afterResponse: [
      // Performance monitoring
      ({ request, response }) => {
        const startTime = request.metadata?.startTime
        if (startTime) {
          const duration = Date.now() - startTime
          analytics.track('api_request', {
            method: request.method,
            url: request.url,
            status: response.status,
            duration
          })
        }
      },
      
      // Success rate tracking
      ({ request, response }) => {
        metrics.increment('api_requests_total', {
          method: request.method,
          status: response.status >= 400 ? 'error' : 'success'
        })
      }
    ],
    
    beforeError: ({ request, response, error }) => {
      // Error tracking
      errorReporting.captureException(error, {
        tags: {
          method: request.method,
          url: request.url,
          status: response.status
        }
      })
      
      return error
    }
  }
})
```

### Caching Hook

```ts
const responseCache = new Map<string, Response>()

const client = defineClient({
  prefixUrl: 'https://api.example.com',
  hooks: {
    afterResponse: ({ request, response }) => {
      // Cache GET requests
      if (request.method === 'GET' && response.ok) {
        const cacheKey = `${request.method}:${request.url}`
        responseCache.set(cacheKey, response.clone())
        
        // Set cache expiry
        setTimeout(() => {
          responseCache.delete(cacheKey)
        }, 5 * 60 * 1000) // 5 minutes
      }
    }
  }
})

// Pre-request cache check would need to be implemented separately
// as there's no beforeRequest hook in this initial implementation
```

## Hook Execution Order

### AfterResponse Hooks

```ts
// Hooks are executed in the order they are defined:
const client = defineClient({
  hooks: {
    afterResponse: [
      hook1, // Executed first
      hook2, // Executed second
      hook3  // Executed third
    ]
  }
})

// Each hook receives the response from the previous hook:
// hook1 receives original response
// hook2 receives response from hook1 (if modified)
// hook3 receives response from hook2 (if modified)
```

### BeforeError Hooks

```ts
// Error hooks are also executed in order:
const client = defineClient({
  hooks: {
    beforeError: [
      errorHook1, // Executed first
      errorHook2, // Executed second
      errorHook3  // Executed third
    ]
  }
})

// Each hook receives the error from the previous hook:
// errorHook1 receives original ResponseError
// errorHook2 receives error from errorHook1 (if modified)
// errorHook3 receives error from errorHook2 (if modified)
```

### Hook Inheritance and Merging

```ts
// Parent client hooks
const parentClient = defineClient({
  hooks: {
    afterResponse: parentHook,
    beforeError: parentErrorHook
  }
})

// Child client with additional hooks
const childClient = parentClient.extend({
  hooks: {
    afterResponse: childHook,
    beforeError: childErrorHook
  }
})

// Execution order for childClient:
// afterResponse: [parentHook, childHook]
// beforeError: [parentErrorHook, childErrorHook]
```

## Hook Context Objects

### AfterResponse Context

```ts
interface AfterResponseContext {
  request: Request   // The original request object
  response: Response // The response from fetch() or previous hook
}

// Example usage:
const afterResponseHook: AfterResponseHook = ({ request, response }) => {
  console.log(`${request.method} ${request.url}`)
  console.log(`Status: ${response.status} ${response.statusText}`)
  console.log(`Headers:`, Object.fromEntries(response.headers))
  
  // Optionally return a modified response
  if (response.headers.get('content-type')?.includes('application/json')) {
    const modifiedResponse = response.clone()
    modifiedResponse.headers.set('X-JSON-Response', 'true')
    return modifiedResponse
  }
}
```

### BeforeError Context

```ts
interface BeforeErrorContext {
  request: Request     // The original request object
  response: Response   // The error response
  error: Error        // The ResponseError or error from previous hook
}

// Example usage:
const beforeErrorHook: BeforeErrorHook = ({ request, response, error }) => {
  console.error(`Request failed: ${request.method} ${request.url}`)
  console.error(`Response: ${response.status} ${response.statusText}`)
  console.error(`Error:`, error.message)
  
  // Return a modified error
  if (response.status === 404) {
    return new Error(`Resource not found: ${request.url}`)
  }
  
  return error
}
```

## Advanced Hook Patterns

### Conditional Hook Execution

```ts
const client = defineClient({
  hooks: {
    afterResponse: ({ request, response }) => {
      // Only process API routes
      if (request.url.includes('/api/')) {
        console.log('API response:', response.status)
      }
    },
    
    beforeError: ({ request, response, error }) => {
      // Only transform client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return new Error(`Client error: ${error.message}`)
      }
      return error
    }
  }
})
```

### Async Hook Operations

```ts
const client = defineClient({
  hooks: {
    afterResponse: async ({ request, response }) => {
      // Async operations are supported
      if (response.ok) {
        await logSuccessfulRequest({
          method: request.method,
          url: request.url,
          timestamp: new Date()
        })
      }
    },
    
    beforeError: async ({ request, response, error }) => {
      // Async error processing
      await reportError({
        error: error.message,
        request: {
          method: request.method,
          url: request.url
        },
        response: {
          status: response.status,
          statusText: response.statusText
        }
      })
      
      return error
    }
  }
})
```

### Hook Composition

```ts
// Create reusable hook functions
const createLoggingHook = (prefix: string): AfterResponseHook => 
  ({ request, response }) => {
    console.log(`[${prefix}] ${request.method} ${request.url} -> ${response.status}`)
  }

const createErrorTransformHook = (statusCode: number, message: string): BeforeErrorHook => 
  ({ response, error }) => {
    if (response.status === statusCode) {
      return new Error(message)
    }
    return error
  }

// Use composed hooks
const client = defineClient({
  hooks: {
    afterResponse: [
      createLoggingHook('API'),
      createLoggingHook('DEBUG')
    ],
    beforeError: [
      createErrorTransformHook(401, 'Please log in to continue'),
      createErrorTransformHook(403, 'You do not have permission to access this resource'),
      createErrorTransformHook(429, 'Too many requests. Please slow down.')
    ]
  }
})
```

## Benefits of the Hooks System

### Inspired by ky Library

1. **Familiar API:** Developers familiar with ky will recognize the hook patterns
2. **Proven Design:** Based on a successful and widely-used HTTP client
3. **Extensible:** Easy to add more hook types in the future
4. **Composable:** Hooks can be combined and reused across different clients

### Request Lifecycle Control

1. **Response Processing:** Modify responses before they reach application code
2. **Error Handling:** Transform errors into more meaningful messages
3. **Cross-cutting Concerns:** Handle logging, analytics, caching at the client level
4. **Debugging:** Add debugging information without modifying application code

### Code Organization

1. **Separation of Concerns:** Keep request/response processing separate from business logic
2. **Reusability:** Share common request processing logic across different API clients
3. **Testability:** Hooks can be tested independently
4. **Maintainability:** Centralized request processing logic

## Future Hook Types

While only `beforeError` and `afterResponse` are implemented in this commit, the architecture supports additional hooks:

```ts
// Potential future hooks:
interface RequestHooks {
  beforeRequest?: BeforeRequestHook | BeforeRequestHook[]     // Modify requests
  afterResponse?: AfterResponseHook | AfterResponseHook[]     // ✅ Implemented
  beforeError?: BeforeErrorHook | BeforeErrorHook[]           // ✅ Implemented
  beforeRetry?: BeforeRetryHook | BeforeRetryHook[]           // Handle retry logic
  afterRetry?: AfterRetryHook | AfterRetryHook[]              // Post-retry processing
}
```

## Performance Considerations

### Hook Execution Overhead

- **Minimal Impact:** Hooks only execute when present
- **Generator-based:** Efficient iteration over multiple hooks
- **Early Return:** No hooks means no processing overhead
- **Async Support:** Proper async/await handling for async hooks

### Memory Usage

- **Hook Storage:** Hooks are stored as part of client options
- **Context Creation:** Minimal context object creation per request
- **Response Cloning:** Only when hooks modify responses

## Migration and Compatibility

### Backward Compatibility

```ts
// Existing code continues to work unchanged:
const client = defineClient({
  prefixUrl: 'https://api.example.com'
  // No hooks - works exactly as before
})
```

### Gradual Adoption

```ts
// Add hooks incrementally:
const client = defineClient({
  prefixUrl: 'https://api.example.com',
  // Start with simple logging
  hooks: {
    afterResponse: ({ request, response }) => {
      console.log(`${request.method} ${request.url} -> ${response.status}`)
    }
  }
})

// Later, add error handling:
const enhancedClient = client.extend({
  hooks: {
    beforeError: ({ error, response }) => {
      if (response.status === 401) {
        return new Error('Authentication required')
      }
      return error
    }
  }
})
```

## Files Modified

- `packages/client/src/client.ts` - Integrated hooks into request processing
- `packages/client/src/types.ts` - Added hook interfaces and types
- `packages/client/src/utils/callHook.ts` - Created hook iteration utility
- `packages/client/src/utils/mergeHooks.ts` - Created hook merging logic
- `packages/client/src/utils/mergeOptions.ts` - Added hooks to options merging

## Related Features

- Client options system
- Request/response processing
- Error handling
- Options merging and inheritance
- Retry mechanism

## Open Questions

No unanswered questions - the implementation provides a solid foundation for the hooks system with clear extension points for future hook types.