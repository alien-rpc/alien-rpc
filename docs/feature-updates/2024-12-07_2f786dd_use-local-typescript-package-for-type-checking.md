# Use Local TypeScript Package for Type-Checking

**Commit:** `2f786dd` (2024-12-07)

## Summary

Refactors the generator to use the local TypeScript package for type-checking operations instead of relying on the TypeScript instance from `@ts-morph/common`. This improves dependency consistency and compatibility with project-specific TypeScript versions.

## User-visible Changes

- Internal refactoring with no user-visible API changes
- Better alignment with project's TypeScript version
- Improved compatibility with different TypeScript configurations
- Potential performance improvements from using local TypeScript instance

## Examples

### Internal API Changes

```typescript
// Before: Used TypeScript from @ts-morph/common
import { ts } from '@ts-morph/common'

// After: Uses local TypeScript package
import type { ts } from '@ts-morph/common'
// TypeScript instance passed as parameter
```

### Updated Function Signatures

```typescript
// analyzeFile() now accepts TypeScript instance as first parameter
export function analyzeFile(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  types: SupportingTypes
)

// analyzeRoute() also accepts TypeScript instance
export function analyzeRoute(
  ts: typeof import('typescript')
  // ... other parameters
)
```

### Generator Usage

```typescript
// Generator now passes TypeScript instance to analysis functions
const ts = require('typescript')
analyzeFile(ts, sourceFile, typeChecker, types)
analyzeRoute(ts, /* other args */)
```

## Config/Flags

No configuration changes required. The generator automatically uses the project's local TypeScript version.

## Breaking/Migration

No breaking changes for users. Internal API changes only affect generator implementation.

## Tags

- generator
- typescript
- internal-refactoring
- compatibility
- dependency-management
- non-breaking

## Evidence

- Updated `packages/generator/src/analyze-file.ts` (accepts TypeScript instance parameter)
- Updated `packages/generator/src/analyze-route.ts` (accepts TypeScript instance parameter)
- Updated `packages/generator/src/generator.ts` (passes TypeScript instance to analysis functions)
- Updated `packages/generator/src/diagnostics.ts` (updated TypeScript usage patterns)
- Updated `packages/generator/src/typebox-codegen/` (updated TypeScript codegen components)
