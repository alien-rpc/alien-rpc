# Add `errorMode` Option to Client

## Commit Metadata

- **Full SHA**: 58ca1cc15f184914ec600201a4ef2406c1108bdb
- **Author**: Alec Larson <1925840+aleclarson@users.noreply.github.com>
- **Date**: Mon Nov 11 08:30:02 2024 -0500
- **Short SHA**: 58ca1cc

## Summary

Adds a new `errorMode` option to the client that controls how errors are handled - either by rejecting promises (default) or returning error tuples.

## User Impact

**Audience**: All alien-rpc client users

**Default Behavior**: Errors continue to reject promises (`errorMode: 'reject'`)

**Opt-in/Opt-out**: Optional configuration - set `errorMode: 'return'` to receive errors as tuple values instead of promise rejections

## How to Use

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

## Configuration and Defaults

- **Option**: `errorMode`
- **Type**: `'return' | 'reject'`
- **Default**: `'reject'`
- **Description**: Controls error handling behavior
  - `'reject'`: Errors reject the promise (traditional behavior)
  - `'return'`: Errors are returned as `[error, undefined]` tuples

## API/CLI Specifics

**Client Options Interface**:

```typescript
export type ClientOptions = {
  errorMode?: ErrorMode
  // ... other options
}

export type ErrorMode = 'return' | 'reject'
```

**Behavior**:

- When `errorMode: 'return'`, route functions return `[error, undefined]` on failure
- When `errorMode: 'return'`, route functions return `[undefined, result]` on success
- When `errorMode: 'reject'` (default), route functions throw errors and return results directly

## Migration/Upgrade Notes

- **No breaking changes**: Default behavior remains unchanged
- **Backward compatible**: Existing code continues to work without modification
- **New option**: Teams can opt into tuple-based error handling for better error management patterns

## Security/Permissions

No security implications - this only changes how errors are returned to the caller.

## Performance/Limits

Minimal performance impact - adds a conditional check and tuple wrapping when `errorMode: 'return'` is used.

## References

**Files Modified**:

- `packages/client/src/client.ts` - Core client logic and error handling
- `packages/client/src/types.ts` - Type definitions for `ErrorMode` and `ClientOptions`

**Related**: This feature provides an alternative to try/catch error handling, useful for functional programming patterns and explicit error handling.

## Open Questions

### Critical

- How do I configure errorMode in ClientOptions; is it `{ errorMode: 'return' | 'reject' }`?
- What is the exact return type difference: does 'return' mode return `Result<T, Error>` or `T | Error`?
- Can I mix error modes within the same client instance, or is it global per client?
- Does errorMode affect TypeScript inference; do I need different type assertions?

### High

- How do I handle errors in 'return' mode: check `result instanceof Error` or use a discriminated union?
- What happens to existing try/catch blocks when switching from 'reject' to 'return' mode?
- Does retry logic in RequestOptions work the same way in both error modes?
- How does errorMode interact with streaming responses and ResponseStream.toArray()?

### Medium

- Can I override errorMode per individual request using RequestOptions?
- How do I migrate existing error handling code when changing errorMode?
- What debugging patterns work best for each error mode in development?
- Does errorMode affect how ConnectionError vs RequestError are handled?
