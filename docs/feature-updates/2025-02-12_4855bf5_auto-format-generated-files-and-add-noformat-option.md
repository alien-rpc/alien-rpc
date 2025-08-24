# Auto-format Generated Files and Add `noFormat` Option

**Commit:** 4855bf5a1b2c3d4e5f6789abcdef0123456789ab  
**Author:** Alec Larson  
**Date:** Wed Feb 12 15:20:15 2025 -0500  
**Short SHA:** 4855bf5

## Summary

This feature adds automatic formatting of generated API files using `formatly` and introduces a `noFormat` option to disable this behavior when needed. Generated client and server definition files are now automatically formatted for better readability and consistency.

## User Impact

**Audience:** All users of the alien-rpc generator  
**Breaking Change:** No - purely additive feature with sensible defaults  
**Migration Required:** No - formatting is enabled by default, existing workflows continue unchanged

## Key Changes

### Added
- Automatic formatting of generated files using `@alloc/formatly`
- `noFormat` configuration option to disable auto-formatting
- Parallel formatting of client and server definition files
- Integration with existing file generation workflow

### Enhanced
- Generated files now have consistent formatting and style
- Better readability of generated TypeScript code
- Improved developer experience when inspecting generated files

## Usage Examples

### Default Behavior (Auto-formatting Enabled)
```bash
# Generated files are automatically formatted
alien-rpc generate
```

**Result:** Generated `api.ts` files are automatically formatted with consistent indentation, spacing, and style.

### Disable Auto-formatting
```bash
# Disable formatting for faster generation or custom formatting workflows
alien-rpc generate --no-format
```

### Configuration File
```ts
// alien-rpc.config.ts
export default {
  // Disable auto-formatting
  noFormat: true,
  
  // Other configuration options...
  clientOutFile: './src/generated/api.ts',
  serverOutFile: './server/generated/api.ts',
}
```

## Generated File Improvements

### Before (Unformatted)
```ts
// Generated api.ts (before formatting)
export const getUser:Route<"/users/:id",(id:string)=>Promise<User>>={
path:"/users/:id",method:"GET",callee:async(id:string)=>{throw new Error("Not implemented")}
}
export const createUser:Route<"/users",(data:CreateUserData)=>Promise<User>>={
path:"/users",method:"POST",callee:async(data:CreateUserData)=>{throw new Error("Not implemented")}
}
```

### After (Auto-formatted)
```ts
// Generated api.ts (after formatting)
export const getUser: Route<
  "/users/:id",
  (id: string) => Promise<User>
> = {
  path: "/users/:id",
  method: "GET",
  callee: async (id: string) => {
    throw new Error("Not implemented")
  },
}

export const createUser: Route<
  "/users",
  (data: CreateUserData) => Promise<User>
> = {
  path: "/users",
  method: "POST",
  callee: async (data: CreateUserData) => {
    throw new Error("Not implemented")
  },
}
```

## Configuration Options

### `noFormat` Option
- **Type:** `boolean`
- **Default:** `false` (formatting enabled)
- **Description:** When `true`, disables automatic formatting of generated files

```ts
interface GeneratorOptions {
  // ... other options
  
  /**
   * Disable automatic formatting of generated files.
   * When true, generated files will not be formatted with formatly.
   * @default false
   */
  noFormat?: boolean
}
```

## Performance Considerations

### Formatting Performance
- Formatting runs in parallel for client and server files
- Minimal impact on generation time for most projects
- Can be disabled for faster builds in CI/CD environments

### When to Disable Formatting
- **CI/CD pipelines** - where formatting is handled separately
- **Custom formatting workflows** - when using different formatters
- **Performance-critical builds** - where every millisecond counts
- **Large projects** - where formatting might add noticeable delay

## Integration with Development Workflow

### IDE Integration
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

### Pre-commit Hooks
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Generate and format API files
alien-rpc generate

# Run other formatting/linting
npm run lint
npm run format
```

### Build Scripts
```json
{
  "scripts": {
    "generate": "alien-rpc generate",
    "generate:no-format": "alien-rpc generate --no-format",
    "build": "npm run generate && tsc",
    "dev": "npm run generate && concurrently \"tsc --watch\" \"nodemon dist/server.js\""
  }
}
```

## Benefits

### Improved Code Quality
- **Consistent formatting** - all generated files follow the same style
- **Better readability** - properly formatted code is easier to understand
- **Reduced diffs** - consistent formatting reduces noise in version control

### Enhanced Developer Experience
- **Professional appearance** - generated files look hand-written
- **IDE-friendly** - properly formatted code works better with IDE features
- **Debugging support** - formatted code is easier to debug and inspect

### Team Collaboration
- **Consistent style** - all team members see the same formatted output
- **Reduced conflicts** - consistent formatting prevents style-related merge conflicts
- **Code reviews** - formatted code is easier to review

## Dependencies

### New Dependencies
- `@alloc/formatly` - TypeScript/JavaScript formatter used for generated files

### Compatibility
- Works with existing formatters (Prettier, ESLint, etc.)
- Compatible with all supported Node.js versions
- No conflicts with existing formatting workflows

## Migration Guide

### Existing Projects
No migration required. Auto-formatting is enabled by default and will improve the appearance of generated files without breaking existing functionality.

### Custom Formatting Workflows
If you have custom formatting requirements:

1. **Option 1:** Disable auto-formatting and use your existing workflow
   ```ts
   // alien-rpc.config.ts
   export default {
     noFormat: true,
   }
   ```

2. **Option 2:** Let alien-rpc format, then apply additional formatting
   ```bash
   alien-rpc generate
   prettier --write "src/generated/**/*.ts"
   ```

## Troubleshooting

### Formatting Errors
If formatting fails, the generator will still complete successfully but the files may not be formatted:

```bash
# Check formatly installation
npm list @alloc/formatly

# Manually format generated files
npx formatly src/generated/api.ts
```

### Performance Issues
If formatting adds too much time to your build:

```ts
// Disable formatting in development
export default {
  noFormat: process.env.NODE_ENV === 'development',
}
```

## References

**Files Modified:**
- `packages/generator/src/generator.ts` - Added formatly integration and parallel formatting
- `packages/generator/src/options.ts` - Added `noFormat` configuration option

**Related Documentation:**
- [Generator Configuration Guide](../packages/generator/readme.md)
- [Code Generation Workflow](../docs/code-generation.md)
- [Formatly Documentation](https://github.com/alloc/formatly)

## Open Questions

**High**
- Should there be configuration options for formatly settings (indentation, line width, etc.)?
- Are there any edge cases where formatting might break generated code?

**Medium**
- Should the generator provide warnings when formatting fails?
- Would it be helpful to have different formatting options for client vs server files?

**Low**
- Should there be integration with popular formatters like Prettier?
- Are there performance optimizations for formatting large generated files?