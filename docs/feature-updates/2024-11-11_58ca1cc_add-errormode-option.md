# Add `errorMode` Option to Client

**Commit:** `58ca1cc` (2024-11-11)

## Summary

Adds a new `errorMode` option to the client that controls how errors are handled - either by rejecting promises (default) or returning error tuples.

## User-visible Changes

- New `errorMode` client option with values `'reject'` (default) or `'return'`
- When `errorMode: 'return'`, route functions return `[error, undefined]` on failure and `[undefined, result]` on success
- When `errorMode: 'reject'` (default), route functions throw errors and return results directly
- Provides alternative to try/catch error handling for functional programming patterns

## Examples

### Default Behavior (Promise Rejection)

```typescript
import { defineClient } from '@alien-rpc/client'
import api from './generated/api.js'

const client = defineClient(api) // errorMode defaults to 'reject'

try {
  const result = await client.getUser('123')
  // Handle success
} catch (error) {
  // Handle error
}
```

### Tuple Return Mode

```typescript
const client = defineClient(api, {
  errorMode: 'return',
})

const [error, result] = await client.getUser('123')
if (error) {
  // Handle error
} else {
  // Handle success with result
}
```

## Config/Flags

- **Option**: `errorMode`
- **Type**: `'return' | 'reject'`
- **Default**: `'reject'`
- **Scope**: Client-wide configuration

## Breaking/Migration

**Non-breaking**: Default behavior remains unchanged. Existing code continues to work without modification.

## Tags

- client
- error-handling
- functional-programming
- tuples
- promise-rejection

## Evidence

- Updated `ClientOptions` interface with `errorMode?: ErrorMode` property
- Modified core client logic in `packages/client/src/client.ts`
- Added `ErrorMode` type definition as `'return' | 'reject'`
- Conditional error handling based on mode selection
