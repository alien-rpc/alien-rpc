# Cache Import Resolutions and Improve Diagnostics

**Commit:** `e89a102` (2024-12-09)

## Summary

Implements import resolution caching and improves diagnostics handling by only processing modules that are used by route-containing files, plus automatic state reset when tsconfig files change. Provides significant performance improvements for generation speed.

## User-visible Changes

- Faster generation with cached import resolutions
- Cleaner diagnostics that only show errors from route-related files
- Automatic cache invalidation when tsconfig files change
- Reduced memory usage and CPU consumption
- Better handling of large codebases with many TypeScript files
- Selective file processing for improved performance

## Examples

### Faster Generation Performance

```bash
# Before: Slower import resolution on each run
npx alien-rpc generate

# After: Cached import resolutions for faster subsequent runs
npx alien-rpc generate  # Much faster on repeated runs
```

### Cleaner Diagnostics Output

```bash
# Before: Diagnostics from all TypeScript files
# After: Only diagnostics from files used by routes

# Example: If you have unused utility files with TypeScript errors,
# they won't clutter the alien-rpc output unless they're imported by routes
```

### Automatic Config Reloading

```bash
# When you modify tsconfig.json, the generator automatically:
# 1. Detects the change
# 2. Clears internal caches
# 3. Reloads with new configuration
```

### Internal Caching Structure

```typescript
interface Store {
  // New caching fields
  includedFiles: Set<ts.SourceFile> // Files used by routes
  directories: Map<string, Directory> // Directory-based caches
  tsConfigFiles: Map<string, TsConfigResolution> // Config caches
}

interface Directory {
  files: Set<ts.SourceFile>
  resolutionCache: Map<string, ResolvedModuleWithFailedLookupLocations>
  seenSpecifiers: Set<string>
  tsConfigFilePath: string | null
}
```

## Config/Flags

No configuration required. All caching and performance improvements work automatically.

## Breaking/Migration

No breaking changes. All existing functionality preserved with automatic performance improvements.

## Tags

- generator
- performance
- caching
- diagnostics
- typescript
- import-resolution
- memory-optimization
- non-breaking

## Evidence

- Updated `packages/generator/src/generator.ts` (main caching logic and state management)
- Updated `packages/generator/src/generator-types.ts` (new type definitions for caching)
- Updated `packages/generator/src/analyze-file.ts` (updated to work with cached resolutions)
- Updated `packages/generator/src/diagnostics.ts` (improved diagnostics filtering)
- Updated `packages/generator/src/typescript/supporting-types.ts` (cache-aware type handling)
- Updated `packages/generator/src/typescript/wrap.ts` (TypeScript module wrapping utilities)
