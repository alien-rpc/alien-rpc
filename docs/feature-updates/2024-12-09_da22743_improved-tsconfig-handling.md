# Improved tsconfig.json Handling

## Commit Metadata

- **Full SHA**: da22743614dcd6296ca8d75643c47f78aa647d35
- **Author**: Alec Larson <1925840+aleclarson@users.noreply.github.com>
- **Date**: Mon Dec 9 18:43:45 2024 -0500
- **Short SHA**: da22743

## Summary

Enhances tsconfig.json handling with automatic reloading, improved change detection, better dependency tracking, and verification that tsconfig files target the correct directories.

## User Impact

**Audience**: All alien-rpc users, especially those with complex TypeScript configurations

**Default Behavior**: More reliable and responsive handling of TypeScript configuration changes

**Opt-in/Opt-out**: Automatic - no user configuration required

## How to Use

This improvement works automatically and provides better developer experience:

### Automatic tsconfig Reloading

```bash
# Before: Manual restart required after tsconfig changes
# 1. Edit tsconfig.json
# 2. Stop alien-rpc generator
# 3. Restart alien-rpc generator

# After: Automatic detection and reloading
# 1. Edit tsconfig.json
# 2. Generator automatically detects change and reloads
```

### Better Change Propagation

```typescript
// When you modify tsconfig.json, the generator now:
// 1. Detects the change
// 2. Identifies all route modules affected by the config
// 3. Emits change events for those modules
// 4. Regenerates only what's necessary

// Example: Changing "strict": true in tsconfig.json
// will trigger regeneration of all affected route modules
```

### Improved Directory Targeting

```json
// The generator now verifies that tsconfig files
// actually target the directories being processed

// tsconfig.json
{
  "include": ["src/**/*"],
  "exclude": ["dist/**/*"]
}

// Generator ensures this config applies to files in src/
// and doesn't incorrectly use configs from parent directories
```

## Configuration and Defaults

- **No configuration required**: Improvements work automatically
- **Automatic discovery**: Uses `fs.findUp` to locate tsconfig files
- **Directory verification**: Ensures tsconfig files target the correct directories
- **Dependency tracking**: Tracks which modules depend on which tsconfig files

## API/CLI Specifics

**Enhanced Features**:

1. **Automatic Reloading**: tsconfig files are watched and reloaded when changed
2. **Change Propagation**: Route modules are notified when their tsconfig changes
3. **Directory Verification**: Ensures tsconfig files apply to the correct scope
4. **Dependency Tracking**: Tracks relationships between configs and modules

**Internal Improvements**:

```typescript
// Enhanced directory handling
interface Directory {
  files: Set<ts.SourceFile>
  resolutionCache: Map<string, ResolvedModuleWithFailedLookupLocations>
  seenSpecifiers: Set<string>
  tsConfig: TsConfigResolution | null // Better config association
}

// Improved config watching
fs.watch(directory.tsConfig.fileName, {
  cause: rootSourceFile.fileName,
})
```

## Migration/Upgrade Notes

- **No breaking changes**: All existing functionality preserved
- **Better reliability**: More consistent behavior with complex tsconfig setups
- **Automatic benefits**: Users get improvements without any changes
- **Dependency upgrade**: Includes jumpgen@0.2.0 for better file watching

## Performance/Limits

**Performance Improvements**:

- **Smarter reloading**: Only reloads what's actually affected by config changes
- **Better caching**: More efficient tsconfig resolution and caching
- **Reduced redundancy**: Avoids processing files with incorrect config associations
- **Optimized watching**: More targeted file watching for config changes

**Reliability Improvements**:

- **Accurate targeting**: Ensures configs apply to the right directories
- **Proper invalidation**: Clears caches when configs change
- **Dependency awareness**: Understands which modules depend on which configs

## Security/Permissions

No security implications - this is a configuration handling improvement.

## References

**Files Modified**:

- `packages/generator/src/generator.ts` - Enhanced config change handling
- `packages/generator/src/generator-types.ts` - Updated type definitions
- `packages/generator/src/typescript/tsconfig.ts` - Improved config resolution
- `packages/generator/src/typescript/wrap.ts` - Better config integration
- `packages/generator/package.json` - Upgraded to jumpgen@0.2.0

**Key Improvements**:

1. **Automatic Reloading**: tsconfig files are watched and reloaded on change
2. **Change Events**: Route modules receive notifications when their tsconfig changes
3. **Directory Verification**: Ensures tsconfig files target the correct directories
4. **Dependency Tracking**: Tracks which modules depend on which configurations
5. **Better Caching**: More efficient config resolution and caching

**Technical Benefits**:

- More responsive development experience
- Better handling of monorepo setups
- Improved reliability with complex TypeScript configurations
- Reduced need for manual restarts
- More accurate config application

**Use Cases**:

- Projects with multiple tsconfig files
- Monorepos with different TypeScript configurations
- Development workflows with frequent config changes
- Complex TypeScript setups with path mapping and custom configurations

**Related**: This enhancement builds on the import resolution caching from the previous commit and provides a more robust foundation for TypeScript configuration management.

## Open Questions

### Critical

- Does alien-rpc automatically reload when I modify tsconfig.json, or do I need to restart?
- Which tsconfig.json settings are most relevant for alien-rpc route generation?
- How do I configure tsconfig.json for monorepos with multiple packages?
- What happens if my tsconfig.json has syntax errors or invalid settings?

### High

- How does alien-rpc handle TypeScript project references in tsconfig.json?
- Can I use a separate tsconfig.json specifically for alien-rpc generation?
- How do I debug tsconfig-related issues during route generation?
- What TypeScript path mapping features work with alien-rpc?

### Medium

- How does tsconfig.json inheritance (extends) work with alien-rpc?
- What happens when different directories have conflicting tsconfig.json settings?
- Can I override specific tsconfig settings for alien-rpc without affecting my build?
- What's the performance impact of watching multiple tsconfig.json files?
