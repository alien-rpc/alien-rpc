# Ensure client.options.headers is Headers object

**Commit:** f3842b1  
**Date:** April 8, 2025  
**Type:** Enhancement

## Overview

This update ensures that `client.options.headers` is always a `Headers` object, providing consistent header handling throughout the client. The change introduces the `ResolvedClientOptions` type and improves header merging logic to guarantee type safety and consistent behavior.

## Changes Made

### 1. New `ResolvedClientOptions` Type

```typescript
export interface ResolvedClientOptions<TErrorMode extends ErrorMode = ErrorMode>
  extends ClientOptions<TErrorMode> {
  errorMode: TErrorMode
  headers: Headers  // Always a Headers object, never HeadersInit
}
```

### 2. Enhanced Header Handling

#### Updated `castHeaders` Function
```typescript
function castHeaders(init: HeadersInit): Headers {
  return new Headers(
    Array.isArray(init) || init instanceof Headers ? init : shake(init)
  )
}
```

#### Improved `mergeHeaders` Function
```typescript
export function mergeHeaders(
  left: HeadersInit | undefined,
  right: HeadersInit | undefined
) {
  const overrides = right && castHeaders(right)
  const merged = left && castHeaders(left)
  if (merged && overrides) {
    overrides.forEach((value, key) => {
      merged.set(key, value)
    })
  }
  return merged || overrides || new Headers()
}
```

### 3. Updated `mergeOptions` Function

```typescript
export function mergeOptions(
  parentOptions: ClientOptions<any> | undefined,
  options: ClientOptions<any> | undefined
): ResolvedClientOptions<any> {
  return {
    ...parentOptions,
    ...options,
    hooks: mergeHooks(parentOptions?.hooks, options?.hooks),
    retry: mergeRetryOptions(parentOptions?.retry, options?.retry),
    headers: mergeHeaders(parentOptions?.headers, options?.headers), // Always returns Headers
    errorMode: options?.errorMode ?? parentOptions?.errorMode ?? 'reject',
  }
}
```

## Key Features

### Consistent Header Type
- `ResolvedClientOptions.headers` is always a `Headers` object
- Eliminates type uncertainty in internal client code
- Provides consistent API for header manipulation

### Robust Header Merging
- Handles all `HeadersInit` types (Headers, array, object)
- Uses `shake()` to remove undefined values from header objects
- Properly merges headers with right-side precedence
- Always returns a `Headers` object, never `undefined`

### Type Safety
- Clear distinction between input (`ClientOptions`) and resolved (`ResolvedClientOptions`) types
- Eliminates need for runtime type checking in client internals
- Provides better TypeScript inference and error detection

## Usage Examples

### Before (Uncertain Header Type)
```typescript
// Headers could be HeadersInit | undefined
const client = createClient({
  headers: { 'Authorization': 'Bearer token' }
})

// Internal code needed type guards
if (client.options.headers instanceof Headers) {
  client.options.headers.set('X-Custom', 'value')
}
```

### After (Guaranteed Headers Object)
```typescript
// Headers are always a Headers object after resolution
const client = createClient({
  headers: { 'Authorization': 'Bearer token' }
})

// Internal code can safely use Headers methods
client.options.headers.set('X-Custom', 'value')
client.options.headers.forEach((value, key) => {
  console.log(`${key}: ${value}`)
})
```

### Header Merging
```typescript
const parentOptions = {
  headers: { 'Authorization': 'Bearer token' }
}

const childOptions = {
  headers: new Headers({ 'Content-Type': 'application/json' })
}

const resolved = mergeOptions(parentOptions, childOptions)
// resolved.headers is a Headers object containing both headers
```

## Implementation Details

### Header Casting Logic
1. **Headers object**: Used directly
2. **Array format**: Passed to `Headers` constructor
3. **Object format**: Filtered with `shake()` to remove undefined values, then passed to constructor

### Merging Strategy
1. Cast both left and right headers to `Headers` objects
2. If both exist, iterate through right headers and set them on left
3. Return merged headers, or right headers, or left headers, or empty `Headers`
4. Never returns `undefined`

### Type Resolution
- Input: `ClientOptions` with `headers?: HeadersInit`
- Output: `ResolvedClientOptions` with `headers: Headers`
- Ensures all downstream code works with consistent types

## Benefits

### For Library Developers
- Eliminates defensive programming around header types
- Simplifies internal client implementation
- Reduces runtime type checking overhead
- Provides consistent API surface

### For End Users
- Transparent change - no API modifications required
- More reliable header handling
- Better TypeScript support in advanced scenarios
- Consistent behavior across different header input formats

## Migration

This change is fully backward compatible. No user code changes are required.

### Internal Code Benefits
```typescript
// Before: Defensive programming required
function addAuthHeader(options: ClientOptions) {
  if (!options.headers) {
    options.headers = new Headers()
  } else if (!(options.headers instanceof Headers)) {
    options.headers = new Headers(options.headers)
  }
  options.headers.set('Authorization', getToken())
}

// After: Direct usage
function addAuthHeader(options: ResolvedClientOptions) {
  options.headers.set('Authorization', getToken())
}
```

## Related Features

- **Header Merging**: Enhanced merging logic for nested client configurations
- **Type Safety**: Improved TypeScript inference throughout the client
- **Request Options**: Consistent header handling in request-level options
- **WebSocket Headers**: Applies to WebSocket upgrade headers as well

This enhancement provides a more robust foundation for header handling while maintaining full backward compatibility with existing code.