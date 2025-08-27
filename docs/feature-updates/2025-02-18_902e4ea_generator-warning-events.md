# Generator Warning Events

**Commit:** `902e4ea` - feat(generator): add "warning" event

## Summary

The generator now emits "warning" events when routes are skipped due to invalid response types, providing better visibility into route processing issues while continuing to generate client code for valid routes.

## User-Visible Changes

- **Warning Events**: Generator emits "warning" events for skipped routes with invalid response types
- **Non-blocking Processing**: Generator continues processing other routes when encountering errors
- **Better Error Visibility**: Clear messages indicate which routes were skipped and why
- **Graceful Degradation**: Client code generated for valid routes even if some routes fail
- **Optional Monitoring**: Warning events can be listened to for debugging purposes
- **No Breaking Changes**: Existing generator behavior unchanged for valid routes

## Examples

**Basic Warning Listener:**
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

**Error Handling Flow:**
```typescript
try {
  const route = analyzeRoute(routeFunction)
  routes.push(route)
} catch (error) {
  if (error instanceof InvalidResponseTypeError) {
    generator.emit('warning', {
      message: `Route skipped: ${error.message}`,
      route: routeFunction.name,
      file: currentFile,
    })
  } else {
    throw error
  }
}
```

## Config/Flags

- **Warning event properties**: `message`, `route`, `file` for debugging context
- **Trigger conditions**: Unsupported response types, non-serializable returns
- **Optional monitoring**: Listen to warning events for debugging

## Breaking/Migration

- **Non-breaking**: Existing generator behavior unchanged
- **No migration**: Code continues to work without changes
- **Graceful degradation**: Valid routes still generate successfully

## Tags

- **Generator enhancement**: Better error visibility
- **Developer experience**: Clear warning messages
- **Error handling**: Non-blocking route processing

## Evidence

- **Implementation**: Generator emits warning events for invalid routes
- **Error handling**: Enhanced flow for `InvalidResponseTypeError`
- **Behavior**: Continues processing valid routes when some fail
- **Monitoring**: Optional warning event listeners for debugging
