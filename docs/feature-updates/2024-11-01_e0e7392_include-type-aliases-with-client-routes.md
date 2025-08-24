# Include Type Aliases with Client Routes

## Commit Metadata

- **Full SHA**: e0e7392511c347bdb4f0c18ae243e9ca48e76101
- **Author**: Alec Larson <1925840+aleclarson@users.noreply.github.com>
- **Date**: Fri Nov 1 14:16:58 2024 -0400
- **Short SHA**: e0e7392

## Summary

The generator now extracts and includes type aliases in the generated client code, improving code readability and reducing duplication by reusing common type definitions.

## User Impact

**Audience**: Developers using alien-rpc with TypeScript

**Default Behavior**: Automatically enabled - the generator now extracts type aliases from route definitions and includes them in both client and server generated files.

**Opt-in/Opt-out**: No configuration required, this is automatic behavior.

## How to Use

No changes required from users. When you define routes with complex types, the generator will automatically:

1. Extract common type definitions (e.g., `Post`, `Author`)
2. Include these as exported types in the generated client file
3. Reference these types in route definitions instead of inlining them

**Example**: Instead of inlining the response schema, the generator now creates:

```typescript
export type Post = { id: string; title: string; body: string; author: Author };
export type Author = { id: string; name: string };

// Route uses the type alias
export const getPost: Route<...> = ...
```

## Configuration and Defaults

- **No configuration options**: This feature is automatically applied
- **Default behavior**: Type aliases are extracted and exported

## API/CLI Specifics

**Generator Changes**:

- Generated client files now include `export type` declarations
- Route schemas reference type aliases instead of inline definitions
- Both client and server generated files benefit from this improvement

## Migration/Upgrade Notes

- **No breaking changes**: Existing code continues to work
- **Improved IntelliSense**: Type aliases provide better autocomplete and documentation
- **Reduced bundle size**: Eliminates duplicate type definitions

## References

**Files Modified**:

- Generator core logic (type extraction)
- Test snapshots showing the new output format
- Both client and server generation templates

**Tests Updated**:

- `test/generator/__snapshots__/basic.snap.ts`
- `test/generator/__snapshots__/pagination.snap.ts`

**Related**: This improvement affects all generated client code and enhances the developer experience with better type definitions.

## Open Questions

### Critical

- How do I import the generated type aliases in ESM vs CJS; are they exported as named exports?
- Can type aliases reference other type aliases that might not be generated, causing build failures?
- Do circular type references in aliases cause infinite recursion during generation or runtime?

### High

- Which type constructs are supported in aliases: generics, conditional types, mapped types, template literals?
- How does the generator determine which aliases to extract vs inline; can this selection be controlled?
- What happens when the same type alias name exists in multiple route files; are there naming conflicts?
- Do generated type aliases preserve TypeScript utility types like `Partial<T>` or `Pick<T, K>`?

### Medium

- Can I augment or extend generated type aliases in my own code without breaking regeneration?
- How do union and intersection types behave when extracted as aliases vs kept inline?
- What is the recommended pattern for organizing route types to maximize alias reuse?
