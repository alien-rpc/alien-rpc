# Remove resultCache Option and Related Methods

**Status:** Breaking Change  
**Commit:** 3979ce9  
**Date:** February 19, 2025

## Summary

Removed built-in `resultCache` option and related caching methods from alien-rpc client to encourage use of specialized caching libraries.

## User-Visible Changes

- Removed `resultCache` option from `ClientOptions` interface
- Removed cache methods: `getCachedResponse()`, `setCachedResponse()`, `unsetCachedResponse()`
- Removed cache types: `CachedResponse`, `RouteResultCache`
- **Breaking:** Requires migration to external caching solutions
- Better integration with React Query, SWR, and other caching libraries

## Examples

### Before (Built-in Cache)
```ts
const client = defineClient(routes, {
  prefixUrl: 'https://api.example.com',
  resultCache: new Map() // Removed
})

const cached = client.getCachedResponse('/users/123') // Removed
client.setCachedResponse('/users/123', response) // Removed
client.unsetCachedResponse('/users/123') // Removed
```

### After (React Query)
```ts
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => client.getUser({ id: userId }),
    staleTime: 5 * 60 * 1000
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  return <div>Hello, {user.name}!</div>
}
```

### After (Custom Cache)
```ts
const cache = new Map()

const client = defineClient(routes, {
  fetch: async (request) => {
    const cacheKey = request.url
    const cached = cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < 300000) {
      return new Response(JSON.stringify(cached.response))
    }
    
    const response = await globalThis.fetch(request)
    if (response.ok) {
      const data = await response.clone().json()
      cache.set(cacheKey, { response: data, timestamp: Date.now() })
    }
    return response
  }
})
```

## Config/Flags

- Removed `resultCache` option from `ClientOptions`
- Removed cache methods and types
- Caching now handled externally

## Breaking/Migration

**Breaking Changes:** Removed `resultCache` option and all cache methods

**Migration:** Replace with external caching solutions (React Query, SWR) or custom `fetch` implementation

## Tags

`breaking-change` `client` `caching` `performance` `migration` `react-query` `swr`

## Evidence

**Bundle Size:** ~2KB reduction from removing built-in caching system  
**Client Interface:** Simplified client configuration and type system  
**Integration:** Better compatibility with external caching libraries  
**Custom Caching:** Available via `fetch` option for advanced use cases
