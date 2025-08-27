# Include Type Aliases with Client Routes

**Commit:** `e0e7392` (2024-11-01)

## Summary

The generator now extracts and includes type aliases in the generated client code, improving code readability and reducing duplication by reusing common type definitions.

## User-visible Changes

- Generator automatically extracts common type definitions from route schemas
- Type aliases are exported in generated client files as `export type` declarations
- Route definitions reference type aliases instead of inlining complex types
- Improved IntelliSense and autocomplete with better type documentation
- Reduced bundle size by eliminating duplicate type definitions

## Examples

### Generated Type Aliases

```typescript
// Generated client file now includes:
export type Post = { id: string; title: string; body: string; author: Author };
export type Author = { id: string; name: string };

// Route uses the type alias instead of inline definitions
export const getPost: Route<{ id: string }, Post> = ...
export const createPost: Route<Post, { success: boolean }> = ...
```

### Before vs After

```typescript
// Before: Inline types (duplicated)
export const getPost: Route<{ id: string }, { id: string; title: string; body: string; author: { id: string; name: string } }> = ...
export const updatePost: Route<{ id: string; title: string; body: string; author: { id: string; name: string } }, { success: boolean }> = ...

// After: Type aliases (reused)
export const getPost: Route<{ id: string }, Post> = ...
export const updatePost: Route<Post, { success: boolean }> = ...
```

## Config/Flags

No configuration required. This feature is automatically applied during code generation.

## Breaking/Migration

**Non-breaking**: Existing code continues to work. Generated files now include additional type exports.

## Tags

- generator
- typescript
- type-aliases
- code-generation
- developer-experience

## Evidence

- Updated generator core logic to extract type aliases from route schemas
- Generated client files include `export type` declarations
- Both client and server generation templates benefit from type reuse
- Updated test snapshots showing new output format
