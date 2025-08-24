# Add noTypeCompiler Option to compileRoutes

**Commit:** 08a2ebb91c5cb61456c52fb44808ece2e3c785f7  
**Author:** Alec Larson  
**Date:** Thu Jan 2 18:28:28 2025 -0500  
**Short SHA:** 08a2ebb

## Summary

This feature adds a `noTypeCompiler` option to the `compileRoutes` function that allows users to disable TypeBox's TypeCompiler for schema validation. When enabled, this option falls back to the slower but more compatible `Value.Decode` method, which can be useful for debugging or when TypeCompiler causes issues.

## User Impact

**Audience:** Users experiencing issues with TypeBox's TypeCompiler or needing debugging capabilities  
**Breaking Change:** No - purely additive option  
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### Added
- `noTypeCompiler` option to `CompileRouteOptions` interface
- `compileSchema` helper function that switches between TypeCompiler and Value.Decode
- Updated `compileRoute` function to accept and pass through options
- Updated `compileRoutes` function to pass options to individual route compilation

### Enhanced
- Path schema compilation now respects the noTypeCompiler option
- Request schema compilation now respects the noTypeCompiler option
- Better error handling and debugging capabilities when TypeCompiler is disabled

## Usage Examples

### Default Behavior (TypeCompiler Enabled)
```ts
import { compileRoutes } from '@alien-rpc/service'
import * as routes from './routes'

// Uses TypeCompiler by default (fastest)
const handler = compileRoutes(routes, {
  prefix: '/api',
  cors: { origin: true }
})
```

### Disabling TypeCompiler
```ts
import { compileRoutes } from '@alien-rpc/service'
import * as routes from './routes'

// Disable TypeCompiler for debugging or compatibility
const handler = compileRoutes(routes, {
  prefix: '/api',
  cors: { origin: true },
  noTypeCompiler: true // ← Disables TypeCompiler
})
```

## When to Use noTypeCompiler

### Debugging Scenarios
```ts
// Enable for better error messages during development
const handler = compileRoutes(routes, {
  noTypeCompiler: process.env.NODE_ENV === 'development'
})
```

### TypeCompiler Compatibility Issues
```ts
// Some complex schemas might not work with TypeCompiler
const handler = compileRoutes(routes, {
  noTypeCompiler: true // Fallback to Value.Decode
})
```

### Performance vs Compatibility Trade-off
```ts
// Choose based on your needs
const handler = compileRoutes(routes, {
  // Fast but less compatible (default)
  noTypeCompiler: false,
  
  // Slower but more compatible
  // noTypeCompiler: true
})
```

## Performance Comparison

### TypeCompiler (Default)
- **Pros:**
  - Fastest validation performance
  - Compiled validation functions
  - Optimized for production use
- **Cons:**
  - May not support all schema features
  - Less detailed error messages
  - Potential compatibility issues with complex schemas

### Value.Decode (noTypeCompiler: true)
- **Pros:**
  - Full schema feature support
  - Better error messages
  - More reliable with complex schemas
- **Cons:**
  - Slower validation performance
  - Runtime interpretation overhead
  - Higher memory usage

## Implementation Details

### Schema Compilation Logic
```ts
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

### Route Compilation
```ts
export function compileRoute(route: Route, options: CompileRouteOptions = {}) {
  const decodePathData = compilePathSchema(route, options)
  const decodeRequestData = compileRequestSchema(route, options)
  // ... rest of compilation
}
```

## Configuration Options

### CompileRouteOptions Interface
```ts
export type CompileRouteOptions = {
  /**
   * Whether to skip TypeBox type compilation.
   * When true, falls back to Value.Decode for better compatibility
   * but slower performance.
   */
  noTypeCompiler?: boolean
  
  // Other existing options
  prefix?: string
  cors?: CorsOptions
}
```

## Use Cases

### Development vs Production
```ts
const isDevelopment = process.env.NODE_ENV === 'development'

const handler = compileRoutes(routes, {
  // Use slower but more debuggable validation in development
  noTypeCompiler: isDevelopment,
  prefix: '/api'
})
```

### Conditional Compilation
```ts
// Enable based on environment variable
const handler = compileRoutes(routes, {
  noTypeCompiler: process.env.DISABLE_TYPE_COMPILER === 'true'
})
```

### Schema Complexity Handling
```ts
// For APIs with very complex schemas that might not work with TypeCompiler
const handler = compileRoutes(routes, {
  noTypeCompiler: true, // Ensure compatibility
  prefix: '/api/v1'
})
```

## Migration Guide

### No Changes Required
Existing code continues to work without modification:

```ts
// This continues to work exactly as before
const handler = compileRoutes(routes, {
  prefix: '/api'
})
```

### Adding the Option
To use the new option, simply add it to your configuration:

```ts
// Add the option when needed
const handler = compileRoutes(routes, {
  prefix: '/api',
  noTypeCompiler: true // ← New option
})
```

## Dependencies

No new dependencies added. Uses existing TypeBox functionality.

## References

**Files Modified:**
- `packages/service/src/compileRoute.ts` - Added noTypeCompiler option and compileSchema helper
- `packages/service/src/compileRoutes.ts` - Updated to pass options through to route compilation

**Related Documentation:**
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [Performance Tuning Guide](../packages/service/docs/performance.md)
- [Schema Validation Documentation](../packages/service/docs/validation.md)

## Open Questions

**High**
- Should there be automatic fallback to Value.Decode when TypeCompiler fails?
- Are there specific schema patterns that consistently require noTypeCompiler?

**Medium**
- Should the option be configurable per-route rather than globally?
- Would it be helpful to have performance metrics comparing the two approaches?

**Low**
- Should there be warnings when noTypeCompiler is enabled in production?
- Are there other TypeBox compilation options that should be exposed?