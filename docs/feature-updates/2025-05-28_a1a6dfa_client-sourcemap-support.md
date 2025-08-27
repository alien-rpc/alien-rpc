# Client Sourcemap Support for Stack Traces

**Status: Enhancement**

## Summary

Adds sourcemap support to the alien-rpc client, enabling automatic resolution of stack traces to original source files in Node.js development environments. Stack traces now point to TypeScript/source files instead of compiled JavaScript.

## User-Visible Changes

- Automatic sourcemap resolution for error stack traces in Node.js
- Enhanced debugging experience with accurate file locations
- Zero impact on browser bundles or production performance
- Graceful fallback when sourcemaps unavailable

## Examples

### Error Stack Trace Resolution

```ts
try {
  await client.users.getById('invalid-id')
} catch (error) {
  // Before: /dist/routes/users.js:45:11
  // After:  /src/routes/users.ts:45:11
  console.error(error.stack)
}
```

### Sourcemap Resolution Implementation

```ts
export async function resolveStackTrace(stack: string | undefined) {
  if (typeof window === 'undefined' && stack) {
    return (await import('resolve-stack-sources')).getSourceMappedString(stack)
  }
  return stack
}
```

## Config/Flags

- Automatic Node.js detection (`typeof window === 'undefined'`)
- Development mode check (`process.env.NODE_ENV !== 'production'`)
- Requires `.js.map` files to be available

## Breaking/Migration

**Breaking Changes:** None - purely additive enhancement

**Migration:** No changes required, automatic improvement

## Tags

`client` `sourcemap` `debugging` `stack-traces` `development` `node.js`

## Evidence

**Performance:** Zero impact on browser bundles or production  
**Integration:** Seamless with existing error handling patterns  
**Reliability:** Graceful fallback when sourcemaps unavailable