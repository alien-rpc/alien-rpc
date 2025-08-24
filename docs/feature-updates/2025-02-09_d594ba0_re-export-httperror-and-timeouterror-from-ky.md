# Re-export HTTPError and TimeoutError from ky

**Commit:** d594ba05d9b9ca4c21ddc27bc3d2ddfa4b6434c5  
**Author:** Alec Larson  
**Date:** Sun Feb 9 12:23:59 2025 -0500  
**Short SHA:** d594ba0

## Summary

This feature re-exports `HTTPError` and `TimeoutError` from the `ky` HTTP client library through the alien-rpc client package. This provides developers with convenient access to these error classes for proper error handling without needing to import them directly from `ky`.

## User Impact

**Audience:** Frontend developers using alien-rpc client  
**Breaking Change:** No - purely additive feature  
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### Added
- Re-export of `HTTPError` from `ky` library
- Re-export of `TimeoutError` from `ky` library
- Improved developer experience for error handling

### Enhanced
- Centralized error class access through alien-rpc client
- Better TypeScript support for error handling
- Reduced need for additional imports

## Usage Examples

### Basic Error Handling
```ts
import { defineClient, HTTPError, TimeoutError } from '@alien-rpc/client'
import * as routes from './generated/api'

const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com'
})

// Handle different types of errors
try {
  const user = await client.getUser({ id: '123' })
  console.log('User:', user)
} catch (error) {
  if (error instanceof HTTPError) {
    // Handle HTTP errors (4xx, 5xx status codes)
    console.error('HTTP Error:', error.response.status, error.message)
    
    if (error.response.status === 404) {
      console.log('User not found')
    } else if (error.response.status >= 500) {
      console.log('Server error occurred')
    }
  } else if (error instanceof TimeoutError) {
    // Handle timeout errors
    console.error('Request timed out:', error.message)
  } else {
    // Handle other errors (network issues, etc.)
    console.error('Unexpected error:', error)
  }
}
```

### Advanced Error Handling
```ts
import { defineClient, HTTPError, TimeoutError } from '@alien-rpc/client'

// Custom error handler function
function handleApiError(error: unknown): never {
  if (error instanceof HTTPError) {
    const status = error.response.status
    const message = error.message
    
    switch (status) {
      case 400:
        throw new Error(`Bad Request: ${message}`)
      case 401:
        throw new Error('Authentication required')
      case 403:
        throw new Error('Access forbidden')
      case 404:
        throw new Error('Resource not found')
      case 429:
        throw new Error('Rate limit exceeded')
      case 500:
        throw new Error('Internal server error')
      default:
        throw new Error(`HTTP Error ${status}: ${message}`)
    }
  } else if (error instanceof TimeoutError) {
    throw new Error('Request timeout - please try again')
  } else {
    throw new Error('Network error - check your connection')
  }
}

// Usage with custom error handler
async function fetchUserSafely(userId: string) {
  try {
    return await client.getUser({ id: userId })
  } catch (error) {
    handleApiError(error)
  }
}
```

### React Error Handling
```tsx
import React, { useState, useEffect } from 'react'
import { defineClient, HTTPError, TimeoutError } from '@alien-rpc/client'

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUser() {
      try {
        setLoading(true)
        setError(null)
        const userData = await client.getUser({ id: userId })
        setUser(userData)
      } catch (err) {
        if (err instanceof HTTPError) {
          if (err.response.status === 404) {
            setError('User not found')
          } else if (err.response.status >= 500) {
            setError('Server error - please try again later')
          } else {
            setError(`Error: ${err.message}`)
          }
        } else if (err instanceof TimeoutError) {
          setError('Request timed out - please check your connection')
        } else {
          setError('An unexpected error occurred')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [userId])

  if (loading) return <div>Loading...</div>
  if (error) return <div className="error">{error}</div>
  if (!user) return <div>No user data</div>

  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

### Retry Logic with Error Types
```ts
import { defineClient, HTTPError, TimeoutError } from '@alien-rpc/client'

async function fetchWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry on client errors (4xx)
      if (error instanceof HTTPError && error.response.status < 500) {
        throw error
      }
      
      // Retry on server errors (5xx) and timeouts
      if (error instanceof HTTPError || error instanceof TimeoutError) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
      
      // Don't retry on other errors
      throw error
    }
  }
  
  throw lastError
}

// Usage
const user = await fetchWithRetry(() => client.getUser({ id: '123' }))
```

## Type Safety

### Error Type Guards
```ts
import { HTTPError, TimeoutError } from '@alien-rpc/client'

// Type-safe error checking
function isHTTPError(error: unknown): error is HTTPError {
  return error instanceof HTTPError
}

function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}

// Usage with type guards
try {
  const result = await client.someOperation()
} catch (error) {
  if (isHTTPError(error)) {
    // TypeScript knows this is HTTPError
    console.log('Status:', error.response.status)
    console.log('Response:', await error.response.text())
  } else if (isTimeoutError(error)) {
    // TypeScript knows this is TimeoutError
    console.log('Timeout after:', error.message)
  }
}
```

### Error Response Typing
```ts
import { HTTPError } from '@alien-rpc/client'

// Access response data from HTTP errors
try {
  await client.createUser({ name: 'John', email: 'invalid-email' })
} catch (error) {
  if (error instanceof HTTPError) {
    // Access the response object
    const response = error.response
    const status = response.status
    const statusText = response.statusText
    
    // Parse error response body
    if (response.headers.get('content-type')?.includes('application/json')) {
      const errorData = await response.json()
      console.log('Validation errors:', errorData.errors)
    }
  }
}
```

## Implementation Details

### Import Changes
```ts
// Before: Only HTTPError was imported
import ky, { HTTPError } from 'ky'

// After: Both HTTPError and TimeoutError are imported
import ky, { HTTPError, TimeoutError } from 'ky'
```

### Export Addition
```ts
// Added at the end of client.ts
export { HTTPError, TimeoutError }
```

### No Runtime Changes
```ts
// The actual error throwing behavior remains unchanged
// This only provides convenient access to the error classes
```

## Comparison with Alternatives

### Before: Direct ky Import Required
```ts
// ❌ Required separate import from ky
import { defineClient } from '@alien-rpc/client'
import { HTTPError, TimeoutError } from 'ky'

const client = defineClient(routes)

try {
  await client.getUser({ id: '123' })
} catch (error) {
  if (error instanceof HTTPError) {
    // Handle HTTP error
  }
}
```

### After: Single Import from alien-rpc
```ts
// ✅ Everything from one import
import { defineClient, HTTPError, TimeoutError } from '@alien-rpc/client'

const client = defineClient(routes)

try {
  await client.getUser({ id: '123' })
} catch (error) {
  if (error instanceof HTTPError) {
    // Handle HTTP error
  }
}
```

### Benefits
```ts
// ✅ Simplified imports
// ✅ Better developer experience
// ✅ Consistent API surface
// ✅ No additional bundle size
// ✅ Same error instances as ky
```

## Error Class Details

### HTTPError Properties
```ts
interface HTTPError extends Error {
  readonly response: Response  // Fetch Response object
  readonly request: Request    // Fetch Request object
  readonly options: Options    // ky options used
}

// Usage
if (error instanceof HTTPError) {
  console.log('Status:', error.response.status)
  console.log('URL:', error.request.url)
  console.log('Method:', error.request.method)
}
```

### TimeoutError Properties
```ts
interface TimeoutError extends Error {
  readonly request: Request  // Fetch Request object
}

// Usage
if (error instanceof TimeoutError) {
  console.log('Timed out URL:', error.request.url)
  console.log('Message:', error.message)
}
```

### Error Inheritance
```ts
// Both extend native Error
HTTPError instanceof Error     // true
TimeoutError instanceof Error  // true

// Can be caught by generic error handlers
try {
  await client.getUser({ id: '123' })
} catch (error: Error) {
  // Will catch both HTTPError and TimeoutError
  console.log('Error message:', error.message)
}
```

## Use Cases

### API Error Handling
- **Status Code Routing:** Handle different HTTP status codes appropriately
- **Retry Logic:** Implement smart retry strategies based on error type
- **User Feedback:** Provide meaningful error messages to users
- **Logging:** Log different error types with appropriate detail levels

### Application Resilience
- **Timeout Handling:** Gracefully handle network timeouts
- **Offline Detection:** Detect and handle network connectivity issues
- **Error Recovery:** Implement fallback strategies for different error types
- **Circuit Breakers:** Build circuit breaker patterns using error classification

### Development and Debugging
- **Error Monitoring:** Categorize errors for monitoring and alerting
- **Testing:** Mock specific error types in unit tests
- **Development Tools:** Build developer tools that understand error types
- **API Documentation:** Document expected error responses

## Migration Guide

### No Breaking Changes
Existing code continues to work without modification:

```ts
// Existing error handling still works
try {
  const result = await client.getUser({ id: '123' })
} catch (error) {
  // Generic error handling continues to work
  console.error('Error:', error)
}
```

### Gradual Enhancement
```ts
// Enhance existing error handling gradually

// Before: Generic error handling
try {
  await client.getUser({ id: '123' })
} catch (error) {
  console.error('Error:', error)
}

// After: Specific error handling
import { HTTPError, TimeoutError } from '@alien-rpc/client'

try {
  await client.getUser({ id: '123' })
} catch (error) {
  if (error instanceof HTTPError) {
    console.error('HTTP Error:', error.response.status)
  } else if (error instanceof TimeoutError) {
    console.error('Timeout Error:', error.message)
  } else {
    console.error('Other Error:', error)
  }
}
```

### Import Simplification
```ts
// Before: Multiple imports
import { defineClient } from '@alien-rpc/client'
import { HTTPError, TimeoutError } from 'ky'

// After: Single import
import { defineClient, HTTPError, TimeoutError } from '@alien-rpc/client'
```

## Dependencies

No new dependencies added. Re-exports existing classes from:
- `ky` - HTTP client library (already a dependency)

## Performance Impact

### Bundle Size
- **No increase:** Re-exports don't add to bundle size
- **Tree shaking:** Unused exports are eliminated by bundlers
- **Same instances:** Uses the exact same error classes as ky

### Runtime Performance
- **No overhead:** Re-exports have zero runtime cost
- **Same behavior:** Error throwing and handling performance unchanged
- **Memory usage:** No additional memory usage

## References

**Files Modified:**
- `packages/client/src/client.ts` - Added HTTPError and TimeoutError re-exports

**Related Documentation:**
- [ky Documentation](https://github.com/sindresorhus/ky) - HTTP client library
- [Client Documentation](../packages/client/readme.md) - Client usage and configuration

**External References:**
- [Fetch API Response](https://developer.mozilla.org/en-US/docs/Web/API/Response)
- [Fetch API Request](https://developer.mozilla.org/en-US/docs/Web/API/Request)
- [Error Handling Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)

## Open Questions

**High**
- Should we also re-export other ky utilities like `Options` interface?
- Would it be useful to provide custom error subclasses with additional context?

**Medium**
- Should we add convenience methods for common error handling patterns?
- Would error code constants be helpful for common HTTP status codes?

**Low**
- Should we provide error serialization utilities for logging?
- Would custom error formatters improve developer experience?