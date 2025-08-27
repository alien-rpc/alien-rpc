# Client Add Hooks Option (Inspired by ky)

**Status: Enhancement** | **Commit:** c7d29ab | **Date:** February 24, 2025

## Summary

Introduces a hooks system to the alien-rpc client, inspired by ky HTTP client library, providing `beforeError` and `afterResponse` hooks for request interception.

## User-Visible Changes

- New `BeforeErrorHook` and `AfterResponseHook` interfaces for request interception
- Added `hooks` option to `ClientOptions` for configuring request hooks
- Automatic execution of hooks during request processing with proper error handling
- Support for multiple hooks and hook inheritance from parent clients
- Ability to modify responses and transform errors through hooks
- Purely additive feature with no impact on existing code

## Examples

### Hook Types
```ts
export interface BeforeErrorHook {
  (context: { request: Request; response: Response; error: Error }): Error | Promise<Error>
}

export interface AfterResponseHook {
  (context: { request: Request; response: Response }): Response | void | Promise<Response | void>
}

export interface ClientOptions {
  hooks?: RequestHooks | readonly RequestHooks[]
}
```

### Basic Hook Usage
```ts
const client = defineClient({
  prefixUrl: 'https://api.example.com',
  hooks: {
    afterResponse: ({ request, response }) => {
      console.log(`${request.method} ${request.url} -> ${response.status}`)
    },
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
  hooks: {
    afterResponse: [
      ({ request, response }) => {
        console.log(`Request took ${Date.now() - request.metadata?.startTime}ms`)
      },
      async ({ request, response }) => {
        const newResponse = response.clone()
        newResponse.headers.set('X-Processed-By', 'alien-rpc-client')
        return newResponse
      }
    ]
  }
})
```

## Config/Flags

- Hook system is automatically available in client options
- No additional setup or flags required

## Breaking/Migration

**Breaking Changes:** None - purely additive feature

**Migration:** No migration required - existing code continues to work unchanged

## Tags

`client` `hooks` `request-lifecycle` `error-handling` `response-transformation` `ky-inspired` `additive`

## Evidence

**Hook System:** Added `BeforeErrorHook` and `AfterResponseHook` interfaces  
**Client Integration:** Hook execution integrated in request processing  
**Utilities:** Hook iteration and merging logic for multiple hooks  
**Options:** Enhanced client options merging with hooks support