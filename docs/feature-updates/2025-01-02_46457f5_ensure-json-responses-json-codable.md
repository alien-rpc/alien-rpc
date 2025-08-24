# Ensure JSON Responses are JSON Codable

**Commit:** 46457f50a95de1804a314212151faab6aa87fc2c  
**Author:** Alec Larson  
**Date:** Thu Jan 2 14:43:46 2025 -0500  
**Short SHA:** 46457f5

## Summary

This feature improves type safety for JSON responses by introducing strict typing that ensures only JSON-serializable values can be passed to JSON response constructors. This prevents runtime errors from attempting to serialize non-JSON-compatible values.

## User Impact

**Audience:** Developers using JsonResponse, BadRequestError, and InternalServerError classes  
**Breaking Change:** No - purely additive type safety  
**Migration Required:** No - existing valid code continues to work

## Key Changes

### Added
- `JSONCodable` type definition for type-safe JSON serialization
- `JSONObjectCodable` type for JSON objects with optional toJSON() method support
- Strict typing for JsonResponse constructor body parameter
- Strict typing for error object parameters in BadRequestError and InternalServerError

### Type Definitions

```ts
type JSONPrimitive = string | number | boolean | null

export type JSONObjectCodable =
  | { [key: string]: JSONCodable | undefined }
  | { toJSON(): JSONObjectCodable }

export type JSONCodable =
  | JSONPrimitive
  | { [key: string]: JSONCodable | undefined }
  | { toJSON(): JSONCodable }
  | readonly JSONCodable[]
```

## Before and After

### Before (Loose Typing)
```ts
import { JsonResponse, BadRequestError } from '@alien-rpc/service'

// Any value was accepted - could cause runtime errors
const response = new JsonResponse({
  data: new Date(), // Would serialize to string, potentially unexpected
  func: () => {}, // Would be lost in serialization
  symbol: Symbol('test') // Would cause JSON.stringify to fail
})

const error = new BadRequestError({
  message: 'Invalid input',
  details: new Map() // Would serialize to {}
})
```

### After (Type-Safe)
```ts
import { JsonResponse, BadRequestError } from '@alien-rpc/service'

// Only JSON-serializable values are accepted
const response = new JsonResponse({
  data: '2025-01-02T19:43:46.000Z', // String representation
  count: 42,
  active: true,
  metadata: null,
  items: ['item1', 'item2']
})

const error = new BadRequestError({
  message: 'Invalid input',
  code: 'VALIDATION_ERROR',
  details: {
    field: 'email',
    reason: 'Invalid format'
  }
})

// Objects with toJSON() method are supported
class CustomError {
  constructor(private code: string, private message: string) {}
  
  toJSON() {
    return { code: this.code, message: this.message }
  }
}

const customError = new BadRequestError({
  message: 'Custom error occurred',
  error: new CustomError('E001', 'Validation failed')
})
```

## Type Safety Benefits

### Compile-Time Validation
```ts
// ❌ TypeScript will now catch these errors at compile time
const invalidResponse = new JsonResponse({
  callback: () => {}, // Error: Function not assignable to JSONCodable
  symbol: Symbol('test'), // Error: Symbol not assignable to JSONCodable
  date: new Date() // Error: Date not assignable to JSONCodable (unless it has toJSON)
})

// ✅ Valid JSON-serializable data
const validResponse = new JsonResponse({
  timestamp: new Date().toISOString(),
  data: { id: 1, name: 'test' },
  items: [1, 2, 3]
})
```

### toJSON() Support
Objects with a `toJSON()` method are automatically supported:
```ts
class User {
  constructor(private id: number, private name: string) {}
  
  toJSON() {
    return { id: this.id, name: this.name }
  }
}

// ✅ Works because User has toJSON() method
const response = new JsonResponse({
  user: new User(1, 'Alice'),
  timestamp: new Date() // Date has toJSON() method
})
```

## Configuration

No configuration changes required. Type checking is enforced automatically by TypeScript.

## Dependencies

No new dependencies added. Uses built-in TypeScript type system.

## References

**Files Modified:**
- `packages/service/src/response.ts` - Updated constructor type signatures
- `packages/service/src/internal/types.ts` - Added JSONCodable type definitions

**Related Documentation:**
- [JSON Response Documentation](../packages/service/docs/json-responses.md)
- [Type Safety Guide](../packages/service/docs/type-safety.md)

## Open Questions

**High**
- Should there be runtime validation to complement the compile-time type checking?
- Are there any common use cases where the strict typing might be too restrictive?

**Medium**
- Should the JSONCodable type be exported publicly for user code that needs to match these constraints?
- Would it be helpful to provide utility functions for converting common non-JSON types (like Date) to JSON-safe formats?

**Low**
- Should there be documentation examples showing how to handle complex objects that need custom serialization?
- Are there performance implications of the stricter typing during TypeScript compilation?