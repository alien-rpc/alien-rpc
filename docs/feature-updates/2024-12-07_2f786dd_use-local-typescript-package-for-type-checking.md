# Use Local TypeScript Package for Type-Checking

## Commit Metadata

- **Full SHA**: 2f786dd0b452ce3f03b4510446f74f573a720ce4
- **Author**: Alec Larson <1925840+aleclarson@users.noreply.github.com>
- **Date**: Sat Dec 7 12:45:09 2024 -0500
- **Short SHA**: 2f786dd

## Summary

Refactors the generator to use the local TypeScript package for type-checking operations instead of relying on the TypeScript instance from `@ts-morph/common`.

## User Impact

**Audience**: All alien-rpc users (internal change with potential compatibility benefits)

**Default Behavior**: No user-visible changes in API or behavior

**Opt-in/Opt-out**: Automatic - no user configuration required

## How to Use

This is an internal change that doesn't require any user action. The generator will automatically use the local TypeScript package for type analysis.

### Before and After

```typescript
// Before: Used TypeScript from @ts-morph/common
import { ts } from '@ts-morph/common'

// After: Uses local TypeScript package
import type { ts } from '@ts-morph/common'
// TypeScript instance passed as parameter
```

## Configuration and Defaults

- **No configuration changes**: Users don't need to modify any settings
- **Dependency management**: The generator now explicitly uses the project's local TypeScript version
- **Compatibility**: Better alignment with the project's TypeScript version

## API/CLI Specifics

**Internal API Changes**:

- `analyzeFile()` now accepts a `ts` parameter as the first argument
- `analyzeRoute()` now accepts a `ts` parameter as the first argument
- Type-checking operations use the passed TypeScript instance

**Function Signatures**:

```typescript
// Updated function signatures
export function analyzeFile(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  types: SupportingTypes
)

export function analyzeRoute(
  ts: typeof import('typescript')
  // ... other parameters
)
```

## Migration/Upgrade Notes

- **No breaking changes**: User-facing API remains unchanged
- **Internal refactoring**: Only affects internal generator implementation
- **Dependency consistency**: Ensures TypeScript version consistency across the project

## Performance/Limits

- **Potential performance improvements**: Using local TypeScript may be more efficient
- **Memory usage**: May reduce memory overhead from multiple TypeScript instances
- **Compatibility**: Better compatibility with project-specific TypeScript configurations

## Security/Permissions

No security implications - this is an internal refactoring change.

## References

**Files Modified**:

- `packages/generator/src/analyze-file.ts` - Updated to accept TypeScript instance parameter
- `packages/generator/src/analyze-route.ts` - Updated to accept TypeScript instance parameter
- `packages/generator/src/generator.ts` - Updated to pass TypeScript instance to analysis functions
- `packages/generator/src/diagnostics.ts` - Updated TypeScript usage patterns
- `packages/generator/src/typebox-codegen/` - Updated TypeScript codegen components

**Technical Details**:

- Removes direct dependency on TypeScript from `@ts-morph/common`
- Passes TypeScript instance explicitly through the call chain
- Maintains type safety with `typeof import('typescript')` type annotations
- Improves dependency management and version consistency

**Related**: This change supports better TypeScript version management and may improve compatibility with different TypeScript versions in user projects.

## Open Questions

### Critical

- Does alien-rpc automatically detect my project's TypeScript version from node_modules?
- What happens if my project uses a different TypeScript version than alien-rpc was built with?
- Can I force alien-rpc to use a specific TypeScript version, or is detection automatic?
- Will this break my build if I'm using an unsupported TypeScript version?

### High

- How do I configure tsconfig.json settings that alien-rpc should respect during generation?
- What TypeScript compiler options are honored vs ignored by the generator?
- Does this work in monorepos where different packages use different TypeScript versions?
- How do I troubleshoot type-checking errors that only appear during alien-rpc generation?

### Medium

- Can I override the TypeScript version detection for specific generator runs?
- What's the performance impact of using my local TypeScript vs a bundled version?
- How do I ensure consistent type-checking across different developer environments?
- Does this affect IDE integration and IntelliSense for generated types?
