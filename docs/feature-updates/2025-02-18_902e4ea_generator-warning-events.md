# Generator Warning Events

**Commit:** `902e4ea` - feat(generator): add "warning" event

## Overview

The generator now emits "warning" events when routes are skipped due to invalid response types. This provides better visibility into why certain routes might not be included in the generated client code.

## What Changed

### Warning Event Emission

When the generator encounters a route with an `InvalidResponseTypeError`, it now:

1. **Catches the error** instead of failing completely
2. **Emits a "warning" event** with details about the skipped route
3. **Continues processing** other routes in the file

### Error Handling Flow

The generator follows this process when analyzing routes:

```typescript
try {
  // Analyze route for type safety and supported response types
  const route = analyzeRoute(routeFunction)
  routes.push(route)
} catch (error) {
  if (error instanceof InvalidResponseTypeError) {
    // Emit warning instead of failing
    generator.emit('warning', {
      message: `Route skipped: ${error.message}`,
      route: routeFunction.name,
      file: currentFile,
    })
  } else {
    throw error // Re-throw other errors
  }
}
```

## When Warnings Are Generated

Warnings are emitted when routes have:

- **Unsupported response types** that can't be serialized/deserialized safely
- **Non-type-safe return values** that would break client-server communication
- **Complex types** that the static analysis can't properly handle

## Benefits

### Better Developer Experience

- **Non-blocking**: Generator continues processing even when some routes fail
- **Visibility**: Developers can see which routes were skipped and why
- **Debugging**: Clear error messages help identify and fix problematic routes

### Improved Reliability

- **Partial success**: Generate client code for valid routes even if some routes fail
- **Graceful degradation**: Application remains functional with subset of routes

## Usage Example

```typescript
import { generateClient } from '@alien-rpc/generator'

const generator = generateClient({
  input: './src/api',
  output: './src/generated/client.ts',
})

// Listen for warnings
generator.on('warning', warning => {
  console.warn(`⚠️  ${warning.message}`)
  console.warn(`   Route: ${warning.route}`)
  console.warn(`   File: ${warning.file}`)
})

await generator.generate()
```

## Migration Notes

- **No breaking changes**: Existing code continues to work unchanged
- **Optional monitoring**: Warning events are optional to listen to
- **Backward compatible**: Generator behavior remains the same for valid routes

## Related

- See [Route Analysis](../generator/route-analysis.md) for details on supported response types
- See [Error Handling](../generator/error-handling.md) for other generator error scenarios
