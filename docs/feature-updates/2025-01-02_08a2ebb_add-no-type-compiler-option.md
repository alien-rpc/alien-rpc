# Add noTypeCompiler Option to compileRoutes

**Commit:** `08a2ebb` (2025-01-02)

## Summary

Adds a `noTypeCompiler` option to `compileRoutes` that disables TypeBox's TypeCompiler for schema validation, falling back to the slower but more compatible `Value.Decode` method. Useful for debugging or when TypeCompiler causes compatibility issues.

## User-visible Changes

- Added `noTypeCompiler` option to `CompileRouteOptions` interface
- Added `compileSchema` helper function that switches between TypeCompiler and Value.Decode
- Updated `compileRoute` and `compileRoutes` functions to support the new option
- Path and request schema compilation now respects the noTypeCompiler option

## Examples

### Basic Usage

```typescript
import { compileRoutes } from '@alien-rpc/service'
import * as routes from './routes'

// Default behavior (TypeCompiler enabled - fastest)
const handler = compileRoutes(routes, {
  prefix: '/api',
  cors: { origin: true }
})

// Disable TypeCompiler for debugging or compatibility
const debugHandler = compileRoutes(routes, {
  prefix: '/api',
  cors: { origin: true },
  noTypeCompiler: true // Falls back to Value.Decode
})
```

### Development vs Production

```typescript
// Use slower but more debuggable validation in development
const handler = compileRoutes(routes, {
  noTypeCompiler: process.env.NODE_ENV === 'development',
  prefix: '/api'
})
```

### Performance vs Compatibility Trade-off

```typescript
// TypeCompiler (default): Fast but less compatible
// Value.Decode (noTypeCompiler: true): Slower but more compatible
const handler = compileRoutes(routes, {
  noTypeCompiler: process.env.DISABLE_TYPE_COMPILER === 'true'
})
```

### Schema Compilation Implementation

```typescript
function compileSchema<Schema extends TSchema, Output>(
  schema: Schema,
  options: CompileRouteOptions
): (input: unknown) => Output {
  if (options.noTypeCompiler) {
    // Use Value.Decode for compatibility
    return (input: unknown) => Decode(schema, input) as Output
  } else {
    // Use TypeCompiler for performance (default)
    const compiledSchema = TypeCompiler.Compile(schema)
    return (input: unknown) => compiledSchema.Decode(input) as Output
  }
}
```

## Config/Flags

- `noTypeCompiler?: boolean` - When true, disables TypeBox TypeCompiler and uses Value.Decode instead
- No other configuration changes required
- Works with all existing `compileRoutes` options

## Breaking/Migration

No breaking changes. Existing code continues to work unchanged. The option is purely additive.

## Tags

- service
- performance
- debugging
- schema-validation
- typebox
- compatibility
- non-breaking

## Evidence

- Updated `packages/service/src/compileRoute.ts` (added noTypeCompiler option and compileSchema helper)
- Updated `packages/service/src/compileRoutes.ts` (passes options through to route compilation)
- No new dependencies added