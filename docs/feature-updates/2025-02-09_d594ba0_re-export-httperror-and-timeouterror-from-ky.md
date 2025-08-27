# Re-export HTTPError and TimeoutError from ky

**Commit:** d594ba05d9b9ca4c21ddc27bc3d2ddfa4b6434c5  
**Author:** Alec Larson  
**Date:** Sun Feb 9 12:23:59 2025 -0500  
**Short SHA:** d594ba0

## Summary

Re-exports `HTTPError` and `TimeoutError` from the `ky` HTTP client library through the alien-rpc client package for convenient error handling without requiring direct `ky` imports.

## User-Visible Changes

- **Simplified imports**: Access error classes directly from `@alien-rpc/client`
- **Better error handling**: Type-safe error classification and handling
- **Improved DX**: No need for separate `ky` imports
- **Enhanced TypeScript support**: Better type inference for error handling
- **Consistent API surface**: All client-related exports in one place
- **No breaking changes**: Purely additive feature

## Examples

### Basic Error Handling
```ts
import { defineClient, HTTPError, TimeoutError } from '@alien-rpc/client'

try {
  const user = await client.getUser({ id: '123' })
} catch (error) {
  if (error instanceof HTTPError) {
    console.error('HTTP Error:', error.response.status)
  } else if (error instanceof TimeoutError) {
    console.error('Request timed out')
  }
}
```

### Advanced Error Handling
```ts
function handleApiError(error: unknown): never {
  if (error instanceof HTTPError) {
    switch (error.response.status) {
      case 404: throw new Error('Resource not found')
      case 500: throw new Error('Internal server error')
    }
  } else if (error instanceof TimeoutError) {
    throw new Error('Request timeout - please try again')
  }
  throw new Error('Network error')
}
```

### Type Guards
```ts
function isHTTPError(error: unknown): error is HTTPError {
  return error instanceof HTTPError
}

if (isHTTPError(error)) {
  console.log('Status:', error.response.status)
  console.log('Response:', await error.response.text())
}
```

### Implementation Details
```ts
// Added to client.ts
export { HTTPError, TimeoutError } from 'ky'

// Before: Multiple imports
import { defineClient } from '@alien-rpc/client'
import { HTTPError, TimeoutError } from 'ky'

// After: Single import
import { defineClient, HTTPError, TimeoutError } from '@alien-rpc/client'
```

## Config/Flags

No configuration required - re-exports are automatically available.

## Breaking/Migration

**Breaking Changes:** None - purely additive feature

**Migration:** Optional - existing code continues to work unchanged

## Tags

`error-handling` `developer-experience` `typescript` `client` `additive`

## Evidence

- Zero bundle size increase (re-exports only)
- Same error instances as `ky` library
- No runtime performance impact
- Improved import ergonomics
- Enhanced TypeScript support