# Remove resultCache Option and Related Methods

**Commit:** 3979ce926b3ad1c4de6d04ce97d86ef2bed38b94
**Author:** Alec Larson
**Date:** Wed Feb 19 14:43:47 2025 -0500
**Short SHA:** 3979ce9

## Summary

This is a **breaking change** that removes the built-in `resultCache` option and related caching methods from the alien-rpc client. The decision focuses on better interoperability with existing caching solutions like React Query, TanStack Query, SWR, and other specialized caching libraries rather than maintaining a basic built-in cache.

## User Impact

**Audience:** All users using the `resultCache` option or cache-related methods
**Breaking Change:** Yes - `resultCache` option and cache methods removed
**Migration Required:** Yes - switch to external caching solutions or implement custom caching

## Key Changes

### Removed Components

#### Client Options

- `resultCache` option from `ClientOptions` interface
- `RouteResultCache` type definition
- Default `new Map()` cache initialization

#### Client Methods

- `getCachedResponse<TPath>(path: TPath)` method
- `setCachedResponse<TPath>(path: TPath, response: CachedResponse<API, TPath>)` method
- `unsetCachedResponse<TPath>(path: TPath)` method

#### Type Definitions

- `CachedResponse<API, TPath>` type
- `RouteResultCache` interface
- `RoutePathname<API>` type
- `ResultFormatter<TResult, TFormatted>` type (replaced with `ResponseParser<TResult>`)

### Updated Components

#### Type System

- `ResultFormatter` replaced with `ResponseParser` for cleaner response handling
- Simplified `ResolvedClientOptions` interface without `resultCache`
- Updated `mergeOptions` utility to exclude cache merging

## Before and After

### Before (With Built-in Cache)

```ts
// Client with built-in caching
const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  resultCache: new Map(), // Built-in cache
  errorMode: 'reject',
})

// Cache management methods
const cachedResponse = client.getCachedResponse('/users/123')
if (!cachedResponse) {
  const response = await client.getUser({ id: '123' })
  client.setCachedResponse('/users/123', response)
}

// Clear specific cache entry
client.unsetCachedResponse('/users/123')

// Custom cache implementation
class LRUCache extends Map {
  constructor(private maxSize: number) {
    super()
  }

  set(key: string, value: any) {
    if (this.size >= this.maxSize) {
      const firstKey = this.keys().next().value
      this.delete(firstKey)
    }
    return super.set(key, value)
  }
}

const clientWithLRU = defineClient(routes, {
  resultCache: new LRUCache(100),
})
```

### After (External Caching Solutions)

```ts
// Client without built-in caching
const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  errorMode: 'reject'
  // resultCache option removed
})

// React Query integration
import { useQuery } from '@tanstack/react-query'

function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => client.getUser({ id: userId }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div>Hello, {user.name}!</div>
}

// SWR integration
import useSWR from 'swr'

function UserProfile({ userId }: { userId: string }) {
  const { data: user, error, isLoading } = useSWR(
    ['user', userId],
    () => client.getUser({ id: userId }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minute
    }
  )

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div>Hello, {user.name}!</div>
}

// Custom caching with fetch option
const cache = new Map<string, { response: any; timestamp: number; ttl: number }>()

const clientWithCustomCache = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  fetch: async (request) => {
    // Only cache GET requests
    if (request.method !== 'GET') {
      return globalThis.fetch(request)
    }

    const cacheKey = request.url
    const cached = cache.get(cacheKey)

    // Return cached response if valid
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return new Response(JSON.stringify(cached.response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch and cache response
    const response = await globalThis.fetch(request)

    if (response.ok) {
      const data = await response.json()
      cache.set(cacheKey, {
        response: data,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000 // 5 minutes
      })

      // Return cloned response
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      })
    }

    return response
  }
})
```

## Migration Guide

### 1. Remove resultCache Usage

```ts
// Before
const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  resultCache: new Map(), // ← Remove this
  errorMode: 'reject',
})

// After
const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  errorMode: 'reject',
})
```

### 2. Replace Cache Method Calls

```ts
// Before
const cached = client.getCachedResponse('/users/123')
if (!cached) {
  const user = await client.getUser({ id: '123' })
  client.setCachedResponse('/users/123', user)
}

// After - Use React Query
const { data: user } = useQuery({
  queryKey: ['user', '123'],
  queryFn: () => client.getUser({ id: '123' }),
})

// After - Use SWR
const { data: user } = useSWR(['user', '123'], () =>
  client.getUser({ id: '123' })
)

// After - Custom implementation
const cache = new Map()
const cacheKey = 'user-123'
let user = cache.get(cacheKey)
if (!user) {
  user = await client.getUser({ id: '123' })
  cache.set(cacheKey, user)
}
```

### 3. Migrate Custom Cache Implementations

```ts
// Before - Custom cache class
class CustomCache extends Map {
  // Custom logic
}

const client = defineClient(routes, {
  resultCache: new CustomCache(),
})

// After - Use fetch option for caching
const customCache = new CustomCache()

const client = defineClient(routes, {
  fetch: async request => {
    // Implement caching logic in fetch
    const cacheKey = `${request.method}:${request.url}`
    const cached = customCache.get(cacheKey)

    if (cached && isCacheValid(cached)) {
      return createCachedResponse(cached)
    }

    const response = await globalThis.fetch(request)

    if (shouldCache(request, response)) {
      const data = await response.clone().json()
      customCache.set(cacheKey, { data, timestamp: Date.now() })
    }

    return response
  },
})
```

## Recommended Caching Solutions

### React Query / TanStack Query

**Best for:** React applications with complex data fetching needs

```ts
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserList />
    </QueryClientProvider>
  )
}

function UserList() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => client.getUsers(),
  })

  // Handle loading, error, and data states
}
```

### SWR

**Best for:** Simple React applications with straightforward caching needs

```ts
import useSWR, { SWRConfig } from 'swr'

function App() {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 60000,
        errorRetryCount: 3,
      }}
    >
      <UserList />
    </SWRConfig>
  )
}

function UserList() {
  const { data: users, error, isLoading } = useSWR(
    'users',
    () => client.getUsers()
  )

  // Handle loading, error, and data states
}
```

### Custom Fetch-based Caching

**Best for:** Non-React applications or custom caching requirements

```ts
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

class RequestCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize = 1000

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    // Implement LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

const requestCache = new RequestCache()

const client = defineClient(routes, {
  fetch: async request => {
    if (request.method !== 'GET') {
      return globalThis.fetch(request)
    }

    const cacheKey = request.url
    const cached = requestCache.get(cacheKey)

    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const response = await globalThis.fetch(request)

    if (response.ok) {
      const data = await response.clone().json()
      requestCache.set(cacheKey, data)
    }

    return response
  },
})
```

## Benefits of External Caching Solutions

### Specialized Features

- **Advanced invalidation strategies** (time-based, tag-based, manual)
- **Background refetching** and stale-while-revalidate patterns
- **Optimistic updates** and mutation handling
- **Request deduplication** and batching
- **Offline support** and persistence
- **DevTools integration** for debugging

### Better Performance

- **Optimized algorithms** (LRU, LFU, TTL-based eviction)
- **Memory management** with configurable limits
- **Network optimization** (request coalescing, prefetching)
- **Selective updates** and partial data fetching

### Framework Integration

- **React hooks** with automatic re-rendering
- **Vue composables** and reactivity
- **Svelte stores** integration
- **Framework-agnostic** solutions for vanilla JS

### Developer Experience

- **TypeScript support** with full type inference
- **DevTools** for cache inspection and debugging
- **Testing utilities** for mocking and assertions
- **Documentation** and community support

## Implementation Details

### Type System Changes

```ts
// Before
export interface Route<TCallee extends Callable = Callable> {
  format: string | ResultFormatter<Awaited<ReturnType<TCallee>>, any>
}

type ResultFormatter<TResult, TFormatted> = (
  result: TResult,
  promisedResponse: Promise<Response>,
  client: Client
) => TFormatted

// After
export interface Route<TCallee extends Callable = Callable> {
  format: string | ResponseParser<Awaited<ReturnType<TCallee>>>
}

type ResponseParser<TResult> = (
  promisedResponse: Promise<Response>,
  client: Client
) => TResult
```

### Client Options Simplification

```ts
// Before
export interface ResolvedClientOptions<TErrorMode extends ErrorMode = ErrorMode>
  extends ClientOptions<TErrorMode> {
  errorMode: TErrorMode
  resultCache: RouteResultCache // ← Removed
}

export interface ClientOptions<TErrorMode extends ErrorMode = ErrorMode> {
  resultCache?: RouteResultCache | undefined // ← Removed
  // ... other options
}

// After
export interface ResolvedClientOptions<TErrorMode extends ErrorMode = ErrorMode>
  extends ClientOptions<TErrorMode> {
  errorMode: TErrorMode
  // resultCache removed
}

export interface ClientOptions<TErrorMode extends ErrorMode = ErrorMode> {
  // resultCache removed
  // ... other options
}
```

### Options Merging Update

```ts
// Before
export function mergeOptions(
  parentOptions: ResolvedClientOptions | undefined,
  options: ClientOptions
): ResolvedClientOptions {
  return {
    // ... other options
    resultCache: options.resultCache ?? parentOptions?.resultCache ?? new Map(),
  }
}

// After
export function mergeOptions(
  parentOptions: ResolvedClientOptions | undefined,
  options: ClientOptions
): ResolvedClientOptions {
  return {
    // ... other options
    // resultCache removed
  }
}
```

## Performance Impact

### Memory Usage

- **Reduced baseline memory** - no built-in cache allocation
- **Configurable limits** - external solutions offer better memory control
- **Garbage collection** - specialized caches handle cleanup more efficiently

### Bundle Size

- **Smaller client bundle** - removed cache-related code
- **Optional dependencies** - caching libraries loaded only when needed
- **Tree shaking** - unused caching features can be eliminated

### Runtime Performance

- **No overhead** - when caching is not needed
- **Optimized algorithms** - external solutions use better caching strategies
- **Framework integration** - better performance with React/Vue optimizations

## Security Considerations

### Cache Isolation

- **No shared state** - external caches can be scoped appropriately
- **Memory leaks** - specialized solutions handle cleanup better
- **Data persistence** - control over what gets cached and where

### Request Interception

- **Fetch option** - allows secure request/response modification
- **Authentication** - easier integration with auth flows
- **Logging** - better control over sensitive data handling

## Related Changes

### Previous Changes

- **Ky removal** (commit 9287eea) - Simplified HTTP client implementation
- **Fetch option** (commit 3592334) - Added custom fetch function support
- **Response validation removal** (commit ccc8f31) - Removed automatic response validation

### Future Enhancements

- **Caching examples** - More documentation on integration patterns
- **Testing utilities** - Helpers for testing with external caches
- **Performance guides** - Best practices for different caching strategies

## References

**Files Modified:**

- `packages/client/src/client.ts` - Removed cache methods and initialization
- `packages/client/src/types.ts` - Updated interfaces and type definitions
- `packages/client/src/utils/mergeOptions.ts` - Removed cache option merging

**External Caching Solutions:**

- [TanStack Query](https://tanstack.com/query) - Powerful data synchronization for React
- [SWR](https://swr.vercel.app/) - Data fetching library with caching
- [Apollo Client](https://www.apollographql.com/docs/react/) - GraphQL client with caching
- [Relay](https://relay.dev/) - Facebook's GraphQL client
- [React Query](https://react-query.tanstack.com/) - Legacy name for TanStack Query

**Documentation:**

- [Client Fetch Option](./client-fetch-option.md) - Custom fetch implementation guide
- [Ky Dependency Removal](./2025-02-16_9287eea_remove-ky-dependency.md) - HTTP client simplification
- [Response Validation Removal](./2025-02-09_ccc8f31_remove-response-validation.md) - Performance optimization
