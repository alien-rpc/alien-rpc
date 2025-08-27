# Migrate to tsc-extra and import-meta-resolve

**Commit:** 7f09f42c42fe0e062c23ba213578975a5984a9d5  
**Author:** Alec Larson  
**Date:** Sun Feb 2 17:33:23 2025 -0500  
**Short SHA:** 7f09f42

## Summary

Migrated generator package from custom TypeScript project management and `esm-resolve` to using `tsc-extra` and `import-meta-resolve`. This modernizes the TypeScript compilation infrastructure, improves module resolution, and simplifies the codebase by leveraging well-maintained external packages.

## User-Visible Changes

- **Faster Compilation:** Optimized TypeScript compilation through `tsc-extra`
- **Better Error Messages:** Enhanced error reporting and diagnostics
- **Improved ESM Support:** Better compatibility with modern JavaScript modules
- **Reduced Memory Usage:** More efficient project management
- **Better Caching:** Improved module resolution caching
- **Transparent Migration:** No functional changes for end users

## Examples

### Project Factory Pattern
```ts
// Before: Custom TypeScript project management
const ts = await import(compilerPath)
store.project = await createProject({
  tsConfigFilePath,
  skipFileDependencyResolution: true,
})

// After: Using tsc-extra factory pattern
store.project = await createProject(root, {
  fs, store, isWatchMode: !!context.watcher,
  tsConfigFilePath: options.tsConfigFile,
})
```

### Simplified Function Calls
```ts
// Before: Multiple parameters passed separately
const argumentTypeLiteral = printTypeLiteralToString(
  ts, argumentType, typeChecker, referencedTypes
)

// After: Consolidated through project instance
const argumentTypeLiteral = project.printTypeLiteralToString(
  argumentType, referencedTypes
)
```

### Module Resolution
```ts
// Before: Using esm-resolve
import { resolveModule } from 'esm-resolve'

// After: Using import-meta-resolve
import { resolve } from 'import-meta-resolve'
```

### Dependencies Updated
```json
// Removed
"esm-resolve": "^1.0.11",
"@ts-morph/bootstrap": "^0.25.0",
"@ts-morph/common": "^0.25.0"

// Added
"tsc-extra": "^0.0.3",
"import-meta-resolve": "^4.1.0"
```

## Config/Flags

No new configuration options - migration is transparent.

## Breaking/Migration

**Breaking Change:** No - internal refactoring only  
**Migration Required:** No - transparent to end users

## Tags

- Internal refactoring
- TypeScript compilation
- Module resolution
- Performance improvement
- Dependency modernization

## Evidence

**Files Modified:** 15+ files across generator package  
**Dependencies:** Removed 3, added 2, moved 1 to dependencies  
**Performance:** Faster compilation, better caching, reduced memory usage  
**Compatibility:** Maintains TypeScript and Node.js version compatibility