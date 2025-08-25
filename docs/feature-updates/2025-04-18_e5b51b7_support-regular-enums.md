# Support Regular Enums

**Commit:** e5b51b7  
**Date:** April 18, 2025  
**Type:** Feature Enhancement

## Overview

This update adds comprehensive support for regular TypeScript enums in alien-rpc routes. Both string and numeric enums are now properly handled in client generation, server validation schemas, and type inference, providing seamless enum usage across the entire RPC stack.

## Changes Made

### 1. Enhanced Type Reference Collection

#### Enum Member Detection
```typescript
// In packages/generator/src/project/utils.ts
isEnumMember(symbol: ts.Symbol): boolean {
  return Boolean(symbol.flags & ts.SymbolFlags.EnumMember)
},

isRegularEnum(symbol: ts.Symbol): boolean {
  return Boolean(symbol.flags & ts.SymbolFlags.RegularEnum)
}
```

#### Enum Reference Handling
```typescript
// In packages/generator/src/project/type-references.ts
if (symbol && ts.isEnumMember(symbol) && declaration) {
  const enumDeclaration = declaration.parent as ts.EnumDeclaration
  if (!referencedTypes.has(enumDeclaration.symbol)) {
    const enumType = typeChecker.getTypeOfSymbol(enumDeclaration.symbol)
    collect(enumType)
  }
}
```

### 2. Enum Declaration Printing

#### Client-Side Enum Generation
```typescript
// In printTypeDeclaration function
if (ts.isRegularEnum(symbol)) {
  typeString =
    (ts.isExportedNode(declaration) ? '' : 'export ') + declaration.getText()
} else {
  // Handle other type declarations...
}
```

### 3. Server-Side TypeBox Schema Generation

Enums are automatically converted to TypeBox `Type.Enum()` schemas for runtime validation:

```typescript
// Generated server schema
enum EnumShapeType {
  Rectangle = "rectangle",
  Circle = "circle",
}
export const ShapeType = Type.Enum(EnumShapeType);
```

## Supported Enum Types

### String Enums
```typescript
enum ShapeType {
  Rectangle = 'rectangle',
  Circle = 'circle',
}
```

### Numeric Enums
```typescript
enum Status {
  Pending,    // 0
  Active,     // 1
  Inactive,   // 2
}
```

### Mixed Enums
```typescript
enum MixedEnum {
  First = 'first',
  Second = 2,
  Third,      // 3
}
```

## Usage Examples

### Route Definition
```typescript
import { route } from '@alien-rpc/service'

enum ShapeType {
  Rectangle = 'rectangle',
  Circle = 'circle',
}

enum Priority {
  Low,
  Medium,
  High,
}

export const createShape = route('/shapes').post(
  async ({ type, priority }: { type: ShapeType; priority?: Priority }) => {
    return {
      type,
      priority: priority ?? Priority.Medium,
      rectangle: ShapeType.Rectangle,
      circle: ShapeType.Circle,
    }
  }
)
```

### Generated Client Code
```typescript
// client/generated/api.ts
import type { Route } from "@alien-rpc/client";

export enum ShapeType {
  Rectangle = "rectangle",
  Circle = "circle",
}

export enum Priority {
  Low,
  Medium,
  High,
}

export default {
  createShape: {
    path: "shapes",
    method: "POST",
    arity: 2,
    format: "json",
  } as Route<
    (
      pathParams: unknown,
      searchParams: unknown,
      body: { type: ShapeType; priority?: Priority | undefined },
    ) => Promise<{
      type: ShapeType;
      priority: Priority;
      rectangle: ShapeType.Rectangle;
      circle: ShapeType.Circle;
    }>
  >,
};
```

### Generated Server Code
```typescript
// server/generated/api.ts
import * as Type from "@sinclair/typebox/type";

enum EnumShapeType {
  Rectangle = "rectangle",
  Circle = "circle",
}
export const ShapeType = Type.Enum(EnumShapeType);

enum EnumPriority {
  Low,
  Medium,
  High,
}
export const Priority = Type.Enum(EnumPriority);

export default [
  {
    path: "/shapes",
    method: "POST",
    name: "createShape",
    import: () => import("../../routes.js"),
    format: "json",
    requestSchema: Type.Object(
      {
        type: ShapeType,
        priority: Type.Optional(Type.Union([Priority, Type.Undefined()])),
      },
      { additionalProperties: false },
    ),
  },
] as const;
```

### Client Usage
```typescript
import { createClient } from '@alien-rpc/client'
import type api, { ShapeType, Priority } from './generated/api.js'

const client = createClient<typeof api>({
  prefixUrl: 'http://localhost:3000'
})

// Type-safe enum usage
const result = await client.createShape({
  type: ShapeType.Rectangle,
  priority: Priority.High
})

// Enum values are preserved in responses
console.log(result.type === ShapeType.Rectangle) // true
console.log(result.priority === Priority.High) // true
```

## Key Features

### Automatic Enum Detection
- Detects regular TypeScript enums in route parameters and return types
- Handles both exported and non-exported enums
- Supports enums used in nested object types

### Client-Side Generation
- Exports enum declarations in generated client code
- Preserves original enum names and values
- Maintains type safety across client and server

### Server-Side Validation
- Generates TypeBox `Type.Enum()` schemas for runtime validation
- Creates prefixed enum declarations to avoid naming conflicts
- Validates enum values in request bodies and parameters

### Type Safety
- Full TypeScript type inference for enum parameters
- Compile-time checking of enum usage
- Runtime validation ensures only valid enum values are accepted

## Implementation Details

### Enum Symbol Detection
The generator uses TypeScript's symbol flags to identify regular enums:
- `ts.SymbolFlags.RegularEnum` for enum declarations
- `ts.SymbolFlags.EnumMember` for individual enum members

### Reference Collection
When an enum member is referenced, the generator:
1. Identifies the parent enum declaration
2. Collects the entire enum type for generation
3. Ensures the enum is included in both client and server outputs

### TypeBox Schema Generation
Server-side enum schemas are generated by:
1. Creating a runtime enum with prefixed name (e.g., `EnumShapeType`)
2. Exporting a TypeBox schema using `Type.Enum()`
3. Using the schema in request validation

### Naming Strategy
- Client enums keep original names
- Server enums use `Enum` prefix to avoid conflicts
- TypeBox schemas use original enum names for exports

## Benefits

### Developer Experience
- **Familiar syntax**: Use standard TypeScript enums
- **IntelliSense support**: Full autocomplete and type checking
- **Refactoring safety**: Enum renames are tracked across the stack

### Type Safety
- **Compile-time validation**: TypeScript catches enum misuse
- **Runtime validation**: Server validates enum values in requests
- **End-to-end consistency**: Same enum values on client and server

### Code Organization
- **Centralized definitions**: Define enums once, use everywhere
- **Clear intent**: Enums make valid values explicit
- **Better documentation**: Self-documenting API contracts

## Migration

This feature is fully backward compatible. Existing code using string literals or union types continues to work unchanged.

### Migrating from String Literals
```typescript
// Before: String literals
export const createShape = route('/shapes').post(
  async ({ type }: { type: 'rectangle' | 'circle' }) => {
    // ...
  }
)

// After: Enums (optional migration)
enum ShapeType {
  Rectangle = 'rectangle',
  Circle = 'circle',
}

export const createShape = route('/shapes').post(
  async ({ type }: { type: ShapeType }) => {
    // ...
  }
)
```

### Benefits of Migration
- Better IntelliSense and autocomplete
- Centralized enum value management
- Easier refactoring when enum values change
- More explicit API documentation

## Edge Cases Handled

### Optional Enum Parameters
```typescript
// Properly handles optional enum parameters
{ priority?: Priority | undefined }

// Generates correct TypeBox schema
Type.Optional(Type.Union([Priority, Type.Undefined()]))
```

### Nested Enum Usage
```typescript
// Enums in nested objects are properly detected
{ config: { mode: DisplayMode; theme: ThemeType } }
```

### Enum Member References
```typescript
// Direct enum member usage is supported
return {
  defaultType: ShapeType.Rectangle,
  allTypes: [ShapeType.Rectangle, ShapeType.Circle]
}
```

## Related Features

- **Type Aliases**: Enums work alongside existing type alias support
- **Request Validation**: Enum values are validated in request bodies
- **Response Types**: Enum types are preserved in response type inference
- **WebSocket Support**: Enums work in WebSocket route definitions

This enhancement makes alien-rpc more ergonomic for APIs that use enums to represent fixed sets of values, providing the same level of type safety and validation as other TypeScript types.