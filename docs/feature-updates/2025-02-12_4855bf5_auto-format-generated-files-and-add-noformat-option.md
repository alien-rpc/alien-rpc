# Auto-format Generated Files and Add `noFormat` Option

**Commit:** 4855bf5 | **Author:** Alec Larson | **Date:** 2025-02-12

## Summary

Adds automatic formatting of generated API files using `@alloc/formatly` with a `noFormat` option to disable when needed. Generated files now have consistent formatting and improved readability.

## User-Visible Changes

- **Auto-formatted output**: Generated files automatically formatted with consistent style
- **Optional formatting**: `noFormat` config option and `--no-format` CLI flag
- **Better readability**: Properly indented and spaced generated TypeScript code
- **Performance control**: Can disable formatting for faster builds
- **Workflow integration**: Works with existing formatters and build processes
- **No breaking changes**: Formatting enabled by default, existing workflows unchanged

## Examples

### Basic Usage
```bash
# Auto-formatting enabled by default
alien-rpc generate

# Disable formatting
alien-rpc generate --no-format
```

### Configuration
```ts
// alien-rpc.config.ts
export default {
  noFormat: true, // Disable auto-formatting
}
```

### Before/After Formatting
```ts
// Before: Unformatted
export const getUser:Route<"/users/:id",(id:string)=>Promise<User>>={path:"/users/:id",method:"GET"}

// After: Auto-formatted
export const getUser: Route<
  "/users/:id",
  (id: string) => Promise<User>
> = {
  path: "/users/:id",
  method: "GET",
}
```

### Implementation Details
- Uses `@alloc/formatly` for TypeScript formatting
- Parallel formatting of client and server files
- Graceful fallback if formatting fails
- Minimal performance impact

## Config/Flags
- `noFormat: boolean` - Disable auto-formatting (default: false)
- `--no-format` CLI flag

## Breaking/Migration
- **Breaking**: None
- **Migration**: None required - formatting enabled by default

## Tags
`generator` `formatting` `developer-experience` `code-quality`

## Evidence
- Files: `packages/generator/src/generator.ts`, `packages/generator/src/options.ts`
- Dependencies: `@alloc/formatly`
- Performance: Parallel formatting, minimal overhead
- Use cases: CI/CD control, custom formatting workflows