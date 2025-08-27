# Support Regular Enums

**Status: Enhancement** | **Commit:** e5b51b7 | **Date:** April 18, 2025

## Summary

Adds comprehensive support for regular TypeScript enums in alien-rpc routes with automatic client generation, server validation, and type inference.

## User-Visible Changes

- Regular TypeScript enums (string, numeric, mixed) now work in routes
- Enums exported in generated client code with preserved names/values
- Automatic TypeBox `Type.Enum()` schema generation for runtime validation
- Full TypeScript inference and compile-time checking for enum parameters
- Backward compatible with existing string literal/union type code

## Examples

### Basic Enum Usage
```typescript
enum ShapeType {
  Rectangle = 'rectangle',
  Circle = 'circle',
}

enum Priority { Low, Medium, High }

export const createShape = route('/shapes').post(
  async ({ type, priority }: { type: ShapeType; priority?: Priority }) => {
    return { type, priority: priority ?? Priority.Medium }
  }
)
```

### Generated Client Code
```typescript
export enum ShapeType {
  Rectangle = "rectangle",
  Circle = "circle",
}

export enum Priority { Low, Medium, High }

export default {
  createShape: {
    path: "shapes",
    method: "POST",
    arity: 2,
    format: "json",
  } as Route<(pathParams: unknown, searchParams: unknown, body: { type: ShapeType; priority?: Priority }) => Promise<{ type: ShapeType; priority: Priority }>>,
};
```

### Generated Server Code
```typescript
enum EnumShapeType { Rectangle = "rectangle", Circle = "circle" }
export const ShapeType = Type.Enum(EnumShapeType);

enum EnumPriority { Low, Medium, High }
export const Priority = Type.Enum(EnumPriority);

export default [
  {
    path: "/shapes",
    method: "POST",
    requestSchema: Type.Object({
      type: ShapeType,
      priority: Type.Optional(Priority),
    }),
  },
] as const;
```

### Client Usage
```typescript
const client = createClient<typeof api>({ prefixUrl: 'http://localhost:3000' })

const result = await client.createShape({
  type: ShapeType.Rectangle,
  priority: Priority.High
})
```

## Key Features

**Automatic Detection:** Detects regular TypeScript enums in route parameters and return types  
**Client Generation:** Exports enum declarations with preserved names/values  
**Server Validation:** Generates TypeBox `Type.Enum()` schemas for runtime validation  
**Type Safety:** Full TypeScript inference and compile-time checking

## Implementation Details

**Symbol Detection:** Uses `ts.SymbolFlags.RegularEnum` and `ts.SymbolFlags.EnumMember`  
**Schema Generation:** Creates prefixed runtime enums (e.g., `EnumShapeType`) with TypeBox schemas  
**Naming Strategy:** Client enums keep original names, server enums use `Enum` prefix

## Migration

Fully backward compatible. Existing string literals or union types continue to work unchanged.

```typescript
// Before: String literals
{ type: 'rectangle' | 'circle' }

// After: Enums (optional)
enum ShapeType { Rectangle = 'rectangle', Circle = 'circle' }
{ type: ShapeType }
```

## Config/Flags

- No configuration required - enums are automatically detected and processed
- Works with existing TypeScript compiler options

## Breaking/Migration

**Breaking Changes:** None - fully backward compatible

**Migration:** Optional migration from string literals to enums for better type safety

## Tags

`enhancement` `typescript` `enums` `validation` `type-safety` `codegen`

## Evidence

**Detection:** Automatic enum detection using TypeScript symbol flags  
**Generation:** Client and server code generation with preserved enum values  
**Validation:** Runtime validation with TypeBox schemas  
**Compatibility:** Works with optional parameters, nested objects, and enum member references