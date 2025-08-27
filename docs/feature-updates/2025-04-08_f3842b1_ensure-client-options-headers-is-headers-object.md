# Ensure client.options.headers is Headers object

**Commit:** f3842b1  
**Date:** April 8, 2025  
**Type:** Enhancement  
**Breaking Change:** ❌ No

## Summary

Ensures that `client.options.headers` is always a `Headers` object, providing consistent header handling throughout the client. Introduces the `ResolvedClientOptions` type and improves header merging logic to guarantee type safety and consistent behavior.

## User-Visible Changes

- **Consistent header type**: `client.options.headers` is always a `Headers` object after resolution
- **Improved header merging**: Enhanced logic handles all `HeadersInit` types properly
- **Type safety**: New `ResolvedClientOptions` type eliminates header type uncertainty
- **Backward compatible**: No API changes required for existing code
- **Better TypeScript support**: Improved inference and error detection

## Examples

```typescript
// Before: Headers could be HeadersInit | undefined
const client = createClient({
  headers: { 'Authorization': 'Bearer token' }
})
if (client.options.headers instanceof Headers) {
  client.options.headers.set('X-Custom', 'value')
}

// After: Headers are always a Headers object
client.options.headers.set('X-Custom', 'value')
client.options.headers.forEach((value, key) => {
  console.log(`${key}: ${value}`)
})
```

## Config/Flags

- New `ResolvedClientOptions` type with `headers: Headers` (always defined)
- Enhanced `mergeHeaders()` function handles all `HeadersInit` types
- Uses `shake()` to remove undefined values from header objects

## Breaking/Migration

- **Breaking**: None
- **Migration**: Fully backward compatible, no user code changes required

## Tags

`headers`, `type-safety`, `client-options`, `typescript`, `backward-compatible`

## Evidence

- **Files modified**: Client options handling, header merging logic
- **New features**: `ResolvedClientOptions` type, enhanced header casting
- **Developer experience**: Eliminates defensive programming, better TypeScript inference