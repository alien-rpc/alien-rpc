# Client Hooks Function Support

**Commit:** `add33fa` (2024-12-21)

## Summary

Enhances the client's `hooks` option to support a function that receives the `Client` instance, enabling dynamic hook configuration based on client state and properties.

## User-visible Changes

- `hooks` option now accepts a function: `(client: Client) => RequestHooks | RequestHooks[]`
- Function-based hooks have access to the complete client instance
- Enables per-instance customization and dynamic hook logic
- Maintains backward compatibility with static hooks

## Examples

### Function-based Hooks

```typescript
const client = defineClient(api, {
  hooks: client => ({
    beforeError: error => {
      console.log(`Error on ${client.options.prefixUrl}:`, error.message)
      return error
    },
    afterResponse: ({ request, response }) => {
      console.log(`${request.method} ${request.url} -> ${response.status}`)
    },
  }),
})
```

### Dynamic Configuration

```typescript
const client = defineClient(api, {
  hooks: client => {
    const hooks: RequestHooks = {
      afterResponse: ({ response }) => {
        if (client.options.prefixUrl?.includes('staging')) {
          console.log('Staging API response:', response.status)
        }
      },
    }

    // Conditional hooks based on client state
    if (client.options.errorMode === 'return') {
      hooks.beforeError = error => {
        error.message = `[Return Mode] ${error.message}`
        return error
      }
    }

    return hooks
  },
})
```

## Config/Flags

No configuration changes required. This extends the existing `hooks` option.

## Breaking/Migration

**Non-breaking**: Existing static hooks continue to work unchanged. Function-based hooks are an additional option.

## Tags

- client
- hooks
- typescript
- dynamic-configuration
- backward-compatible

## Evidence

- Updated `ClientOptions.hooks` type to include function signature
- Function-based hooks resolved once during client creation
- Client instance passed to function is fully initialized
- Supports hook merging with `client.extend()`
