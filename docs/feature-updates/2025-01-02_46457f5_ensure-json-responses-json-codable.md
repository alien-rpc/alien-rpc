# Ensure JSON Responses are JSON Codable

**Commit:** `46457f5` (2025-01-02)

## Summary

Improves type safety for JSON responses by introducing strict typing that ensures only JSON-serializable values can be passed to JSON response constructors, preventing runtime serialization errors.

## User-visible Changes

- Added `JSONCodable` type definition for type-safe JSON serialization
- Strict typing for `JsonResponse` constructor body parameter
- Strict typing for error object parameters in `BadRequestError` and `InternalServerError`
- Compile-time validation prevents non-JSON-compatible values
- Support for objects with `toJSON()` method

## Examples

### Type-Safe JSON Responses

```typescript
import { JsonResponse, BadRequestError } from '@alien-rpc/service'

// ✅ Valid JSON-serializable data
const response = new JsonResponse({
  timestamp: new Date().toISOString(),
  data: { id: 1, name: 'test' },
  items: [1, 2, 3],
  active: true,
  metadata: null
})

// ❌ TypeScript catches these errors at compile time
const invalidResponse = new JsonResponse({
  callback: () => {}, // Error: Function not assignable to JSONCodable
  symbol: Symbol('test'), // Error: Symbol not assignable to JSONCodable
  date: new Date() // Error: Date not assignable (unless it has toJSON)
})
```

### toJSON() Method Support

```typescript
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

### Error Handling

```typescript
const error = new BadRequestError({
  message: 'Invalid input',
  code: 'VALIDATION_ERROR',
  details: {
    field: 'email',
    reason: 'Invalid format'
  }
})
```

## Config/Flags

No configuration required. Type checking is enforced automatically by TypeScript.

## Breaking/Migration

**Non-breaking**: Purely additive type safety. Existing valid code continues to work without modification.

## Tags

- service
- type-safety
- json-serialization
- response-handling
- compile-time-validation

## Evidence

- Added `JSONCodable` and `JSONObjectCodable` type definitions
- Updated constructor type signatures in `packages/service/src/response.ts`
- Type definitions in `packages/service/src/internal/types.ts`
- Supports objects with `toJSON()` method for custom serialization