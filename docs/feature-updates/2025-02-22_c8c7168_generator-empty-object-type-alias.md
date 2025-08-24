# Generator Empty Object Type Alias

**Commit:** c8c7168654cbfecaf2bbaf2be20950dbab8c1e74
**Author:** Alec Larson
**Date:** Sat Feb 22 12:45:40 2025 -0500
**Short SHA:** c8c7168

## Summary

This commit allows the generator to treat `{}` as an alias for `Record<string, never>` when processing route handler data arguments. This provides a more convenient shorthand for routes that don't accept any data parameters while maintaining type safety.

## User Impact

**Audience:** Developers defining route handlers with empty data arguments
**Breaking Change:** No - additive enhancement
**Migration Required:** No - existing code continues to work unchanged

## Key Changes

### Type Alias Processing

```ts
// In packages/generator/src/generator.ts
const generateRequestSchema = async (
  argumentType: string,
  contentType: 'json' | 'json-qs'
) => {
  // Treat {} as an empty object.
  if (argumentType === '{}') {
    argumentType = 'Record<string, never>' // ← Added transformation
  }
  let schema = await project.generateRuntimeValidator(
    `type Request = ${argumentType}`
  )
  // ... rest of schema generation
}
```

### Semantic Interpretation

- **Technical meaning of `{}`:** "value must be non-nullish"
- **Practical meaning in route context:** Since route data arguments are never null or undefined, `{}` has no practical distinction from `Record<string, never>`
- **Generator treatment:** `{}` is automatically converted to `Record<string, never>` during schema generation

## Implementation Details

### Type Transformation Flow

```
1. Route handler defined with {} type
   ↓
2. Generator analyzes argument types
   ↓
3. Detects argumentType === '{}'
   ↓
4. Transforms to 'Record<string, never>'
   ↓
5. Generates runtime validator schema
   ↓
6. Client receives proper empty object type
```

### Processing Context

- **Applies to:** Route handler data arguments only
- **Scope:** Request schema generation phase
- **Timing:** Before runtime validator generation
- **Effect:** Transparent to end users

## Usage Examples

### Before: Explicit Record Type

```ts
import { route } from '@alien-rpc/service'

// Explicit empty object type
export const getStatus = route.get(
  '/status',
  async (data: Record<string, never>) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    }
  }
)

// Or with no data parameter
export const getHealth = route.get('/health', async () => {
  return { status: 'ok' }
})
```

### After: Convenient {} Alias

```ts
import { route } from '@alien-rpc/service'

// Using {} as shorthand - now supported
export const getStatus = route.get('/status', async (data: {}) => {
  // ← Equivalent to Record<string, never>
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  }
})

// Still works without data parameter
export const getHealth = route.get('/health', async () => {
  return { status: 'ok' }
})

// Both generate identical client code
```

### Client Usage (Identical)

```ts
// Generated client treats both the same way
const client = defineClient(routes)

// Both calls work identically
const status1 = await client.getStatus() // No data needed
const status2 = await client.getHealth() // No data needed

// Type safety maintained
const status3 = await client.getStatus({}) // ✅ Valid
const status4 = await client.getStatus({ invalid: 'data' }) // ❌ Type error
```

### POST Routes with Empty Data

```ts
// POST route that doesn't need request body data
export const triggerSync = route.post('/sync/trigger', async (data: {}) => {
  // ← Shorthand for empty object
  await startSyncProcess()
  return { triggered: true }
})

// Client usage
const result = await client.triggerSync({}) // Must pass empty object
```

### Mixed Route Definitions

```ts
// File can mix different approaches
export const routes = {
  // Using {} shorthand
  getVersion: route.get('/version', async (data: {}) => {
    return { version: '1.0.0' }
  }),

  // Using explicit Record type
  getInfo: route.get('/info', async (data: Record<string, never>) => {
    return { info: 'API Information' }
  }),

  // No data parameter
  getPing: route.get('/ping', async () => {
    return { pong: true }
  }),

  // With actual data
  createUser: route.post(
    '/users',
    async (data: { name: string; email: string }) => {
      return await createUser(data)
    }
  ),
}

// All generate appropriate client types
```

## Type Safety Considerations

### Runtime Validation

```ts
// Both generate identical runtime validators

// Route with {} type
export const routeA = route.get('/a', async (data: {}) => ({ result: 'a' }))

// Route with Record<string, never> type
export const routeB = route.get('/b', async (data: Record<string, never>) => ({
  result: 'b',
}))

// Generated schemas are identical:
// {
//   type: 'object',
//   properties: {},
//   additionalProperties: false
// }
```

### Client Type Inference

```ts
// Client types are identical for both approaches
type ClientA = typeof client.routeA // () => Promise<{ result: string }>
type ClientB = typeof client.routeB // () => Promise<{ result: string }>

// Both require empty object if data parameter exists
const resultA = await client.routeA() // ✅ Valid (no data param in original)
const resultB = await client.routeB({}) // ✅ Valid (empty object required)
```

### TypeScript Compatibility

```ts
// {} type is standard TypeScript
function acceptsEmptyObject(obj: {}) {
  // obj can be any non-nullish value
  console.log(obj)
}

// In route context, this distinction doesn't matter
function routeHandler(data: {}) {
  // data is always a non-null object in route handlers
  // so {} effectively means "empty object" here
}
```

## Benefits

### Developer Experience

- **Shorter syntax** - `{}` is more concise than `Record<string, never>`
- **Familiar pattern** - `{}` is commonly used in TypeScript for empty objects
- **Consistent behavior** - Works identically to explicit Record type
- **No learning curve** - Developers already understand `{}` type

### Code Readability

```ts
// More readable
export const getStatus = route.get('/status', async (data: {}) => {
  return { status: 'healthy' }
})

// vs less readable
export const getStatus = route.get(
  '/status',
  async (data: Record<string, never>) => {
    return { status: 'healthy' }
  }
)
```

### Flexibility

- **Optional adoption** - Teams can choose which style to use
- **Mixed usage** - Can use both styles in same codebase
- **No performance impact** - Identical runtime behavior

## Potential Considerations

### Team Preferences

Some teams might prefer explicit `Record<string, never>` for clarity:

```ts
// Explicit approach (still supported)
export const explicitRoute = route.get(
  '/explicit',
  async (data: Record<string, never>) => {
    return { message: 'explicit empty object type' }
  }
)

// Shorthand approach (now supported)
export const shorthandRoute = route.get('/shorthand', async (data: {}) => {
  return { message: 'shorthand empty object type' }
})
```

### Code Style Guidelines

Teams can establish conventions:

```ts
// Option 1: Always use explicit Record type
const styleGuide1 = {
  emptyData: 'Record<string, never>',
  reason: 'Explicit and clear intent',
}

// Option 2: Always use {} shorthand
const styleGuide2 = {
  emptyData: '{}',
  reason: 'Concise and familiar',
}

// Option 3: Mixed based on context
const styleGuide3 = {
  getRoutes: '{}', // Simple GET routes
  postRoutes: 'Record<string, never>', // POST routes for clarity
  reason: 'Context-appropriate',
}
```

### Documentation Clarity

```ts
// Teams might prefer explicit types for documentation
/**
 * Gets system status
 * @param data - Empty object (no parameters required)
 */
export const getStatus = route.get(
  '/status',
  async (data: Record<string, never>) => {
    // ← Self-documenting
    return { status: 'healthy' }
  }
)

// vs

/**
 * Gets system status
 * @param data - No parameters required
 */
export const getStatus = route.get('/status', async (data: {}) => {
  // ← Requires comment for clarity
  return { status: 'healthy' }
})
```

## Generated Code Impact

### Server-Side Generation

```ts
// Both approaches generate identical server route definitions
const serverRoutes = [
  {
    method: 'GET',
    path: '/status',
    name: 'getStatus',
    import: () => import('./routes/status'),
    format: 'json',
    requestSchema: {
      // ← Identical schema generated
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
```

### Client-Side Generation

```ts
// Both approaches generate identical client methods
class GeneratedClient {
  async getStatus(): Promise<{ status: string; timestamp: string }> {
    return this.request({
      method: 'GET',
      path: '/status',
      searchParams: {}, // ← Empty object handling
    })
  }
}
```

## Integration with Other Features

### Request Validation

```ts
// Runtime validation treats both identically
const validateRequest = (data: unknown) => {
  // Schema generated from both {} and Record<string, never>
  const schema = {
    type: 'object',
    properties: {},
    additionalProperties: false,
  }

  return Value.Check(schema, data) // Must be empty object
}
```

### Middleware Integration

```ts
// Middleware sees identical data types
const loggingMiddleware = handler => {
  return async (data: {} | Record<string, never>) => {
    console.log('Request data:', data) // Always {}
    return handler(data)
  }
}
```

### WebSocket Routes

```ts
// Also works with WebSocket routes
export const wsStatus = route.ws(async (data: {}, ctx) => {
  // ← Shorthand supported
  return new JsonStream<{ status: string }>()
})
```

## Testing Considerations

### Unit Testing

```ts
// Tests work identically for both approaches
describe('Route handlers', () => {
  it('handles empty data with {} type', async () => {
    const result = await getStatusWithShorthand({})
    expect(result).toEqual({ status: 'healthy' })
  })

  it('handles empty data with Record type', async () => {
    const result = await getStatusWithExplicit({})
    expect(result).toEqual({ status: 'healthy' })
  })
})
```

### Integration Testing

```ts
// Client integration tests are identical
describe('Client integration', () => {
  it('calls routes with empty data', async () => {
    const client = defineClient(routes)

    // Both work the same way
    const result1 = await client.routeWithShorthand()
    const result2 = await client.routeWithExplicit()

    expect(result1).toBeDefined()
    expect(result2).toBeDefined()
  })
})
```

## Migration from Previous Versions

### No Migration Required

```ts
// Existing code continues to work unchanged
export const existingRoute = route.get(
  '/existing',
  async (data: Record<string, never>) => {
    return { message: 'still works' }
  }
)

// New shorthand can be adopted gradually
export const newRoute = route.get('/new', async (data: {}) => {
  // ← Can start using immediately
  return { message: 'new shorthand' }
})
```

### Gradual Adoption

```ts
// Teams can migrate incrementally
const routes = {
  // Keep existing explicit types
  legacyRoute: route.get('/legacy', async (data: Record<string, never>) => {
    return { legacy: true }
  }),

  // Use shorthand for new routes
  modernRoute: route.get('/modern', async (data: {}) => {
    return { modern: true }
  }),
}
```

## Performance Impact

### Runtime Performance

- **No performance difference** - Identical generated code
- **Same validation cost** - Schema generation is equivalent
- **Memory usage** - No additional memory overhead

### Build Performance

- **Minimal impact** - Simple string replacement during generation
- **No additional analysis** - Type transformation is straightforward
- **Same bundle size** - Generated client code is identical

## Related Changes

### Generator Evolution

- **Warning events** (commit 902e4ea) - Better error reporting during generation
- **Type alias support** - Foundation for this enhancement
- **Request schema generation** - Where this transformation occurs

### Type System Integration

- **Route type definitions** - Compatible with existing route builders
- **Client type inference** - Maintains type safety
- **Runtime validation** - Uses same validation schemas

## Future Enhancements

### Potential Extensions

- **Other type aliases** - Could support additional shorthand types
- **Custom transformations** - Configurable type mappings
- **Validation customization** - Team-specific empty object handling

### Related Improvements

- **Better error messages** - More specific guidance on empty object usage
- **Documentation generation** - Automatic docs for shorthand types
- **IDE integration** - Enhanced autocomplete for type aliases

## References

**Files Modified:**

- `packages/generator/src/generator.ts` - Added `{}` to `Record<string, never>` transformation

**Related Documentation:**

- [Generator Warning Events](./generator-warning-events.md) - Error handling improvements
- [Route Type Safety](../generator/route-analysis.md) - Type analysis in generator
- [Request Validation](../service/request-validation.md) - Runtime schema validation

**TypeScript References:**

- [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) - TypeScript object type documentation
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) - Record utility type
- [Type Aliases](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases) - TypeScript type alias patterns

**Best Practices:**

- Use `{}` for concise empty object types in route handlers
- Consider team preferences when choosing between `{}` and `Record<string, never>`
- Both approaches provide identical runtime behavior and type safety
- Document your team's preferred style in coding guidelines
