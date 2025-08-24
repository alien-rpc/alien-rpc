# Cache Import Resolutions and Improve Diagnostics

## Commit Metadata

- **Full SHA**: e89a1021fc1e18f49a08e5d5cf8561538f6801d8
- **Author**: Alec Larson <1925840+aleclarson@users.noreply.github.com>
- **Date**: Mon Dec 9 11:21:47 2024 -0500
- **Short SHA**: e89a102

## Summary

Implements import resolution caching and improves diagnostics handling by only processing modules that are used by route-containing files, plus automatic state reset when tsconfig files change.

## User Impact

**Audience**: All alien-rpc users (performance improvement)

**Default Behavior**: Faster generation with more focused error reporting

**Opt-in/Opt-out**: Automatic - no user configuration required

## How to Use

This is an internal performance optimization that works automatically. Users will experience:

### Faster Generation

```bash
# Before: Slower import resolution on each run
npx alien-rpc generate

# After: Cached import resolutions for faster subsequent runs
npx alien-rpc generate  # Much faster on repeated runs
```

### Cleaner Diagnostics

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

## Configuration and Defaults

- **No configuration required**: Caching works automatically
- **Cache scope**: Import resolutions are cached per directory and tsconfig
- **Cache invalidation**: Automatic when tsconfig files change
- **Diagnostics filtering**: Only reports errors from route-related files

## API/CLI Specifics

**Internal Caching Structure**:

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

**Performance Optimizations**:

- **Import resolution caching**: Avoids re-resolving the same imports
- **Directory-based organization**: Shares resolution context within directories
- **Selective file processing**: Only processes files imported by routes
- **Smart cache invalidation**: Clears caches when configuration changes

## Migration/Upgrade Notes

- **No breaking changes**: All existing functionality preserved
- **Performance improvement**: Generation should be noticeably faster
- **Cleaner output**: Fewer irrelevant TypeScript diagnostics
- **Better resource usage**: Reduced memory and CPU usage

## Performance/Limits

**Performance Improvements**:

- **Faster import resolution**: Cached resolutions avoid repeated file system operations
- **Reduced TypeScript processing**: Only processes relevant files
- **Memory efficiency**: Better cache management and cleanup
- **Incremental updates**: Smarter handling of file changes

**Cache Management**:

- **Automatic cleanup**: Unused cache entries are identified and removed
- **Per-directory caching**: Efficient sharing of resolution context
- **Config-aware caching**: Separate caches for different TypeScript configurations

## Security/Permissions

No security implications - this is a performance optimization.

## References

**Files Modified**:

- `packages/generator/src/generator.ts` - Main caching logic and state management
- `packages/generator/src/generator-types.ts` - New type definitions for caching
- `packages/generator/src/analyze-file.ts` - Updated to work with cached resolutions
- `packages/generator/src/diagnostics.ts` - Improved diagnostics filtering
- `packages/generator/src/typescript/supporting-types.ts` - Cache-aware type handling
- `packages/generator/src/typescript/wrap.ts` - TypeScript module wrapping utilities

**Key Features**:

1. **Import Resolution Caching**: Avoids re-resolving the same imports multiple times
2. **Selective File Processing**: Only processes files that are actually used by routes
3. **Diagnostics Filtering**: Reports only relevant TypeScript errors
4. **Automatic State Reset**: Clears caches when tsconfig files change
5. **Directory-based Organization**: Efficient cache sharing within directories

**Technical Benefits**:

- Reduced file system operations
- Lower memory usage
- Faster incremental builds
- More focused error reporting
- Better handling of large codebases

**Related**: This optimization significantly improves the developer experience, especially for larger projects with many TypeScript files.

## Open Questions

### Critical

- Is the import resolution cache persisted between generator runs or only in-memory?
- How do I clear the cache when I move or rename files in my project?
- What happens to cached resolutions when I add new dependencies to package.json?
- Does the cache work correctly in monorepos with multiple tsconfig.json files?

### High

- How much memory does the resolution cache typically use for large projects?
- Can I configure the cache size or set limits to prevent memory issues?
- What diagnostic information is available to debug cache hits vs misses?
- How does the cache interact with TypeScript path mapping in tsconfig.json?

### Medium

- Can I get statistics on cache hit/miss ratios to measure performance improvements?
- How do I debug issues where cached resolutions become stale or incorrect?
- Does the cache handle dynamic imports and conditional imports correctly?
- What's the cache invalidation strategy when dependencies are updated?
