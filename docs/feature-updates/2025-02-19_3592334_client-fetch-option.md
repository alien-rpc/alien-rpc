# Client Fetch Option Implementation

**Date**: 2025-02-19  
**Commit**: 3592334  
**Type**: Feature Addition  
**Scope**: Client  
**Breaking**: No  

## Summary

Added `fetch` option to client for custom HTTP request handling, testing, and authentication.

## User-Visible Changes

- **New `fetch` option**: Override default `globalThis.fetch` with custom implementation
- **Testing support**: Mock HTTP requests without real network calls
- **Authentication flows**: Add custom headers, token refresh, request transformation
- **Request/response logging**: Monitor and debug HTTP traffic
- **Caching strategies**: Implement custom response caching logic
- **Non-breaking**: Defaults to `globalThis.fetch` when not specified
- **ky migration**: Restores custom fetch capability from removed ky dependency

## Examples

### Basic Usage

```ts
const client = defineClient(routes, {
  fetch: async (request: Request) => {
    // Custom request handling
    return globalThis.fetch(request)
  },
})
```

### Testing with Mocks

```ts
const mockFetch = async (request: Request) => {
  if (request.url.includes('/users/123')) {
    return new Response(JSON.stringify({ id: 123, name: 'John' }))
  }
  return new Response('Not Found', { status: 404 })
}

const testClient = defineClient(routes, { fetch: mockFetch })
```

### Authentication

```ts
const authFetch = async (request: Request) => {
  const authRequest = new Request(request, {
    headers: { ...request.headers, Authorization: `Bearer ${token}` }
  })
  return globalThis.fetch(authRequest)
}
```

## Config/Flags

- **fetch**: `(request: Request) => Promise<Response>` - Custom fetch function override
- **Default**: Uses `globalThis.fetch` when not specified
- **Integration**: Works with all existing client options

## Breaking/Migration

- **Non-breaking**: Additive enhancement only
- **No migration**: Existing code continues unchanged
- **ky restoration**: Restores custom fetch from removed ky dependency

## Tags

- **Client enhancement**: HTTP request customization
- **Testing**: Mock request support
- **Authentication**: Custom header injection

## Evidence

- **Implementation**: Added optional `fetch` property to `ClientOptions`
- **Files modified**: `packages/client/src/types.ts`, `packages/client/src/createFetchFunction.ts`
- **Usage patterns**: Testing mocks, auth flows, logging, caching
- **Performance**: Zero overhead when unused
