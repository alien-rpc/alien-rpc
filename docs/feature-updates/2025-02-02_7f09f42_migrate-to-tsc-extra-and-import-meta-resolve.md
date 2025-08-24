# Migrate to tsc-extra and import-meta-resolve

**Commit:** 7f09f42c42fe0e062c23ba213578975a5984a9d5  
**Author:** Alec Larson  
**Date:** Sun Feb 2 17:33:23 2025 -0500  
**Short SHA:** 7f09f42

## Summary

This commit migrates the generator package from custom TypeScript project management and `esm-resolve` to using `tsc-extra` and `import-meta-resolve`. This modernizes the TypeScript compilation infrastructure, improves module resolution, and simplifies the codebase by leveraging well-maintained external packages.

## User Impact

**Audience:** Internal development - users should see no functional changes  
**Breaking Change:** No - internal refactoring only  
**Migration Required:** No - transparent to end users

## Key Changes

### Dependencies Updated
- **Removed:** `esm-resolve`, `@ts-morph/bootstrap`, `@ts-morph/common`
- **Added:** `tsc-extra@^0.0.3`, `import-meta-resolve@^4.1.0`
- **Moved:** `pathic` from devDependencies to dependencies

### Architecture Improvements
- **Project Management:** Replaced custom TypeScript project setup with `tsc-extra`'s `createProjectFactory`
- **Module Resolution:** Switched from `esm-resolve` to `import-meta-resolve` for better ESM compatibility
- **Type System:** Simplified type checking and compilation pipeline
- **Code Organization:** Consolidated utility functions and improved separation of concerns

### Refactored Components
- **Project Creation:** New `createProject` function using `tsc-extra`'s factory pattern
- **Type Printing:** Enhanced type literal printing with better error handling
- **Utils Consolidation:** Moved TypeScript utilities to dedicated modules
- **Dependency Resolution:** Improved module resolution with better caching

## Technical Details

### New Project Architecture
```ts
// Before: Custom TypeScript project management
const ts = await import(compilerPath)
store.ts = wrapTypeScriptModule(ts, fs, store, !!context.watcher)
store.project = await createProject({
  tsConfigFilePath,
  skipFileDependencyResolution: true,
})

// After: Using tsc-extra factory pattern
store.project = await createProject(root, {
  fs,
  store,
  isWatchMode: !!context.watcher,
  tsConfigFilePath: options.tsConfigFile,
})
```

### Enhanced Project Factory
```ts
export const createProject = createProjectFactory(function (
  project: tscExtra.Project,
  { fs, store, isWatchMode }: ProjectOptions,
  compiler: unknown
) {
  const ts = compiler as typeof import('typescript')
  const utils = createUtils(ts)
  const printTypeLiteralToString = createTypePrinter(project, utils)
  
  return {
    printTypeLiteralToString,
    watchMissingImport,
    collectDependencies,
    needsPathSchema,
    generateRuntimeValidator,
    generateServerTypeAliases,
    utils,
  }
})
```

### Simplified Function Signatures
```ts
// Before: Multiple parameters passed separately
const argumentTypeLiteral = printTypeLiteralToString(
  ts,
  argumentType,
  typeChecker,
  referencedTypes
)

// After: Consolidated through project instance
const argumentTypeLiteral = project.printTypeLiteralToString(
  argumentType,
  referencedTypes
)
```

### Module Resolution Improvements
```ts
// Before: Using esm-resolve
import { resolveModule } from 'esm-resolve'

// After: Using import-meta-resolve
import { resolve } from 'import-meta-resolve'
```

## Benefits

### Maintainability
- **Reduced Custom Code:** Less custom TypeScript project management code to maintain
- **External Dependencies:** Leverages well-maintained packages (`tsc-extra`, `import-meta-resolve`)
- **Cleaner Architecture:** Better separation of concerns and more modular design

### Performance
- **Optimized Compilation:** `tsc-extra` provides optimized TypeScript compilation
- **Better Caching:** Improved module resolution caching
- **Reduced Memory Usage:** More efficient project management

### Developer Experience
- **Better Error Messages:** Enhanced error reporting through `tsc-extra`
- **Improved Debugging:** Cleaner stack traces and better diagnostics
- **Modern ESM Support:** Better compatibility with modern JavaScript modules

## Implementation Details

### Project Factory Pattern
```ts
export type Project = Awaited<ReturnType<typeof createProject>>

export type ProjectOptions = tscExtra.ProjectOptions & {
  fs: JumpgenFS
  store: Store
  isWatchMode: boolean
}
```

### Utility Functions Consolidation
```ts
// New utils module with consolidated TypeScript helpers
const utils = createUtils(ts)

// Enhanced type printer with project context
const printTypeLiteralToString = createTypePrinter(project, utils)
```

### Dependency Collection
```ts
function collectDependencies(
  sourceFile: ts.SourceFile,
  compilerOptions: ts.CompilerOptions,
  moduleResolutionHost: ts.ModuleResolutionHost
): Directory {
  // Enhanced dependency resolution with better caching
  // and improved module resolution
}
```

## Files Modified

### Core Files
- `packages/generator/package.json` - Updated dependencies
- `packages/generator/src/generator.ts` - Simplified project creation
- `packages/generator/src/project.ts` - New project factory implementation

### Project Modules
- `packages/generator/src/project/analyze-file.ts` - Updated to use new project API
- `packages/generator/src/project/analyze-route.ts` - Simplified function calls
- `packages/generator/src/project/diagnostics.ts` - Enhanced error handling
- `packages/generator/src/project/supporting-types.ts` - Streamlined type creation
- `packages/generator/src/project/tsconfig.ts` - Improved configuration handling
- `packages/generator/src/project/type-printer.ts` - New type printing implementation
- `packages/generator/src/project/type-references.ts` - Enhanced reference tracking
- `packages/generator/src/project/utils.ts` - Consolidated utility functions

### TypeScript Utilities
- `packages/generator/src/typescript/print-type-literal.ts` - Refactored type printing
- `packages/generator/src/typescript/utils.ts` - Cleaned up utility functions

### Other
- `packages/generator/src/generator-types.ts` - Updated type definitions
- `packages/generator/src/typebox-codegen/index.ts` - Updated to use new project API

## Migration Guide

### For Contributors
No changes required for external users. For contributors working on the generator:

```ts
// Old pattern - accessing TypeScript directly
const ts = store.ts
const result = someFunction(ts, type, typeChecker, refs)

// New pattern - using project methods
const project = store.project
const result = project.someMethod(type, refs)
```

### Development Setup
No changes to development workflow - the migration is transparent:

```bash
# Same commands work as before
npm install
npm run build
npm test
```

## Compatibility

### TypeScript Versions
- Maintains compatibility with existing TypeScript versions
- Better support for modern TypeScript features through `tsc-extra`

### Node.js Versions
- Improved ESM compatibility through `import-meta-resolve`
- Better support for modern Node.js versions

## Performance Impact

### Compilation Speed
- **Faster:** Optimized TypeScript compilation through `tsc-extra`
- **Better Caching:** Improved module resolution caching
- **Reduced Overhead:** Less custom code execution

### Memory Usage
- **Lower:** More efficient project management
- **Better GC:** Improved garbage collection through better object lifecycle management

## Dependencies

### New Dependencies
- `tsc-extra@^0.0.3` - Modern TypeScript project management
- `import-meta-resolve@^4.1.0` - ESM-compatible module resolution

### Removed Dependencies
- `esm-resolve@^1.0.11` - Replaced by `import-meta-resolve`
- `@ts-morph/bootstrap@^0.25.0` - No longer needed
- `@ts-morph/common@^0.25.0` - No longer needed

## References

**External Packages:**
- [tsc-extra](https://github.com/aleclarson/tsc-extra) - TypeScript compilation utilities
- [import-meta-resolve](https://github.com/wooorm/import-meta-resolve) - ESM module resolution

**Related Documentation:**
- [TypeScript Compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)

## Open Questions

**High**
- Are there any edge cases in module resolution that need special handling?
- Should we add performance benchmarks to track compilation speed improvements?

**Medium**
- Would it be beneficial to expose more `tsc-extra` configuration options?
- Should we add migration guides for other packages that might want to adopt `tsc-extra`?

**Low**
- Are there additional TypeScript utilities from `tsc-extra` we should leverage?
- Should we consider contributing improvements back to the `tsc-extra` package?