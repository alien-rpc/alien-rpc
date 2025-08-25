# Include Exported Types in Generated Output

**Commit:** e71ff6385bf6ae2c8fe5aea34eafa6cc0e41286b  
**Author:** Alec Larson  
**Date:** Sun Jul 20 17:10:58 2025 -0400  
**Short SHA:** e71ff63

## Summary

This is an **additive enhancement** that includes exported types in the generated client output, addressing two critical edge cases in type analysis. The generator now automatically discovers and includes exported type declarations (type aliases, interfaces, enums) from analyzed files, ensuring comprehensive type coverage and preventing runtime reference errors.

## User Impact

**Audience:** Developers using complex type systems with alien-rpc  
**Breaking Change:** No - purely additive enhancement  
**Migration Required:** No - automatic improvement  
**Status:** Enhancement - improves type coverage and reliability

## Problem Statement

This enhancement addresses two specific edge cases that could cause runtime errors:

### Edge Case 1: Flattened Union Type Aliases

When you have a non-generic type alias that is a union type, TypeScript's type checker flattens it, making the type alias "disappear" from the type checker's perspective. This made it impossible for alien-rpc to detect usage of the type alias in route parameters, leading to reference errors at runtime.

```ts
// This type alias gets flattened by TypeScript's type checker
export type Status = 'pending' | 'approved' | 'rejected'

// Route using the flattened type alias
export const updateStatus = defineRoute({
  method: 'POST',
  path: '/api/status',
  handler: async (pathParams: {}, searchParams: {}, body: { status: Status }) => {
    // Runtime error: Status is not defined in generated client
    return { success: true }
  }
})
```

### Edge Case 2: Output-Only Types

Types used exclusively in route output types may not be discovered through static analysis of input parameters, causing them to be missing from the generated client.

```ts
// Type used only in route output
export interface ProcessingResult {
  id: string
  status: 'completed' | 'failed'
  metadata: Record<string, any>
}

export const processData = defineRoute({
  method: 'POST',
  path: '/api/process',
  handler: async (pathParams: {}, searchParams: {}, body: { data: string }) => {
    // ProcessingResult might not be included in generated output
    return { result: { id: '123', status: 'completed', metadata: {} } as ProcessingResult }
  }
})
```

## Solution

The generator now analyzes all exported type declarations in files containing alien-rpc routes and automatically includes them in the generated output. This ensures comprehensive type coverage regardless of how or where types are used.

## Key Changes

### Added
- Automatic discovery of exported type declarations (type aliases, interfaces, enums)
- Enhanced static analysis to crawl type syntax trees
- Support for export declarations and named exports
- Comprehensive type reference collection
- Workaround for TypeScript type checker limitations

### Enhanced
- File analysis now processes all exported types, not just route-referenced types
- Type collection includes syntax tree analysis to preserve flattened types
- Export declaration handling for re-exported types
- Improved type reference tracking and deduplication

## Implementation Details

### Enhanced File Analysis

**File:** `packages/generator/src/project/analyze-file.ts`

The file analyzer now processes all exported declarations:

```ts
const visitor = (
  node: ts.Node,
  moduleDeclaration?: ts.ModuleDeclaration
): void => {
  if (!ts.isExportedNode(node)) {
    return // Only consider exported declarations
  }

  // Process type declarations (interfaces, type aliases, enums)
  if (isTypeDeclaration(ts, node)) {
    collectTypeDeclarations(ts, node, project, onTypeDeclaration)
  }
  
  // Process export declarations (export { Type })
  else if (
    ts.isExportDeclaration(node) &&
    node.exportClause &&
    ts.isNamedExports(node.exportClause)
  ) {
    node.exportClause.elements.forEach(specifier => {
      if (ts.isIdentifier(specifier.name)) {
        collectTypeDeclarations(
          ts,
          specifier.name,
          project,
          onTypeDeclaration
        )
      }
    })
  }
  
  // Continue processing routes...
}
```

### New Type Collection System

**File:** `packages/generator/src/project/type-nodes.ts`

A comprehensive type collection system that crawls syntax trees:

```ts
export function collectTypeDeclarations(
  ts: ProjectUtils,
  typeNode: ts.TypeNode | ts.NamedDeclaration | ts.EntityName,
  project: Project,
  onTypeDeclaration: (typeDeclaration: TypeDeclaration) => void
) {
  const typeChecker = project.getTypeChecker()
  const seen = new Set<ts.Symbol>()

  function crawlTypeNode(typeNode: ts.TypeNode) {
    // Handle type references, unions, intersections, arrays, tuples, etc.
    if (ts.isTypeReferenceNode(typeNode)) {
      resolveTypeName(typeNode.typeName)
      typeNode.typeArguments?.forEach(crawlTypeNode)
    }
    // ... handle other type node kinds
  }

  function resolveTypeName(name: ts.EntityName) {
    let symbol = typeChecker.getSymbolAtLocation(name)
    if (!symbol) return

    // Resolve aliases to get the original symbol
    if (symbol.flags & ts.SymbolFlags.Alias) {
      symbol = typeChecker.getAliasedSymbol(symbol)
    }

    // Process the symbol's declarations
    const declarations = symbol.getDeclarations()
    if (declarations && !isLibSymbol(declarations)) {
      crawlTypeDeclaration(declarations[0])
    }
  }
}
```

### Enhanced Export Detection

**File:** `packages/generator/src/project/utils.ts`

Improved export detection to handle export declarations:

```ts
isExportedNode(
  node: ts.Node & { modifiers?: readonly ts.ModifierLike[] }
): boolean {
  return Boolean(
    ts.isExportDeclaration(node) ||  // export { Type }
      node.modifiers?.some(
        modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
      )  // export type Type = ...
  )
}
```

## Usage Examples

### Flattened Union Type Aliases

**Before (Problematic):**
```ts
// types.ts
export type UserRole = 'admin' | 'user' | 'guest'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

// routes.ts
export const updateUserRole = defineRoute({
  method: 'PUT',
  path: '/api/users/:id/role',
  handler: async (
    pathParams: { id: string },
    searchParams: {},
    body: { role: UserRole }  // Type gets flattened, reference lost
  ) => {
    return { success: true, role: body.role }
  }
})

export const updateRequestStatus = defineRoute({
  method: 'PUT',
  path: '/api/requests/:id/status',
  handler: async (
    pathParams: { id: string },
    searchParams: {},
    body: { status: RequestStatus }  // Type gets flattened, reference lost
  ) => {
    return { success: true, status: body.status }
  }
})

// Generated client would have runtime errors:
// ReferenceError: UserRole is not defined
// ReferenceError: RequestStatus is not defined
```

**After (Fixed):**
```ts
// types.ts - Same type definitions
export type UserRole = 'admin' | 'user' | 'guest'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

// routes.ts - Same route definitions
export const updateUserRole = defineRoute({
  method: 'PUT',
  path: '/api/users/:id/role',
  handler: async (
    pathParams: { id: string },
    searchParams: {},
    body: { role: UserRole }  // Now properly included in generated output
  ) => {
    return { success: true, role: body.role }
  }
})

// Generated client now includes:
// type UserRole = 'admin' | 'user' | 'guest'
// type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
// No runtime errors!
```

### Output-Only Types

**Before (Problematic):**
```ts
// types.ts
export interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
  requestId: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  notifications: boolean
  language: string
}

// routes.ts
export const getUserProfile = defineRoute({
  method: 'GET',
  path: '/api/users/:id/profile',
  handler: async (pathParams: { id: string }) => {
    const profile = await fetchUserProfile(pathParams.id)
    // These types used only in output might be missing from generated client
    return {
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    } as ApiResponse<UserProfile>
  }
})

// Generated client might be missing ApiResponse, UserProfile, UserPreferences
```

**After (Fixed):**
```ts
// types.ts - Same type definitions
export interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
  requestId: string
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  notifications: boolean
  language: string
}

// routes.ts - Same route definition
export const getUserProfile = defineRoute({
  method: 'GET',
  path: '/api/users/:id/profile',
  handler: async (pathParams: { id: string }) => {
    const profile = await fetchUserProfile(pathParams.id)
    // All exported types now automatically included
    return {
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    } as ApiResponse<UserProfile>
  }
})

// Generated client now includes all exported types:
// interface ApiResponse<T> { ... }
// interface UserProfile { ... }
// interface UserPreferences { ... }
```

### Complex Type Hierarchies

```ts
// types.ts - Complex type system
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
  status: EntityStatus
}

export interface User extends BaseEntity {
  name: string
  email: string
  role: UserRole
  profile: UserProfile
}

export interface Organization extends BaseEntity {
  name: string
  domain: string
  settings: OrganizationSettings
  members: OrganizationMember[]
}

export interface OrganizationMember {
  userId: string
  role: MemberRole
  permissions: Permission[]
  joinedAt: string
}

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'
export type Permission = 'read' | 'write' | 'delete' | 'manage_users' | 'manage_settings'

export interface OrganizationSettings {
  allowPublicSignup: boolean
  defaultMemberRole: MemberRole
  features: FeatureFlag[]
}

export type FeatureFlag = 'advanced_analytics' | 'custom_branding' | 'sso' | 'api_access'

// routes.ts
export const createOrganization = defineRoute({
  method: 'POST',
  path: '/api/organizations',
  handler: async (
    pathParams: {},
    searchParams: {},
    body: { name: string; domain: string }
  ) => {
    const org = await createNewOrganization(body)
    // Complex return type with nested references
    return org as Organization
  }
})

export const updateMemberRole = defineRoute({
  method: 'PUT',
  path: '/api/organizations/:orgId/members/:userId/role',
  handler: async (
    pathParams: { orgId: string; userId: string },
    searchParams: {},
    body: { role: MemberRole; permissions?: Permission[] }
  ) => {
    const member = await updateOrganizationMemberRole(
      pathParams.orgId,
      pathParams.userId,
      body.role,
      body.permissions
    )
    return member as OrganizationMember
  }
})

// All exported types automatically included in generated client:
// - EntityStatus, BaseEntity, User, Organization
// - OrganizationMember, MemberRole, Permission
// - OrganizationSettings, FeatureFlag
// - UserRole, UserProfile (from previous examples)
```

### Re-exported Types

```ts
// shared-types.ts
export interface DatabaseEntity {
  id: string
  version: number
  metadata: Record<string, any>
}

export type SortOrder = 'asc' | 'desc'
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin'

// api-types.ts
export { DatabaseEntity, SortOrder, FilterOperator } from './shared-types.js'

export interface QueryOptions {
  limit?: number
  offset?: number
  sort?: { field: string; order: SortOrder }
  filters?: Array<{
    field: string
    operator: FilterOperator
    value: any
  }>
}

// routes.ts
import { QueryOptions } from './api-types.js'

export const searchEntities = defineRoute({
  method: 'POST',
  path: '/api/search',
  handler: async (
    pathParams: {},
    searchParams: {},
    body: QueryOptions  // Uses re-exported types
  ) => {
    const results = await performSearch(body)
    return { results, total: results.length }
  }
})

// Generated client includes both direct exports and re-exports:
// - QueryOptions (from api-types.ts)
// - DatabaseEntity, SortOrder, FilterOperator (re-exported from shared-types.ts)
```

## Type Discovery Process

### 1. Export Analysis

The generator scans for all exported declarations:

```ts
// Direct exports
export type Status = 'active' | 'inactive'
export interface User { id: string; name: string }
export enum Priority { Low, Medium, High }

// Export declarations
export { DatabaseEntity, QueryOptions } from './shared-types.js'

// Default exports (not processed - use named exports for types)
export default class ApiClient { }
```

### 2. Syntax Tree Crawling

For each exported type, the generator crawls the syntax tree to find all referenced types:

```ts
// Starting from this exported interface
export interface ComplexType {
  basic: string
  reference: OtherType          // → Discovers OtherType
  union: 'a' | 'b' | CustomType // → Discovers CustomType
  array: SomeType[]             // → Discovers SomeType
  tuple: [FirstType, SecondType] // → Discovers FirstType, SecondType
  nested: {
    prop: NestedType            // → Discovers NestedType
  }
  generic: GenericType<ParamType> // → Discovers GenericType, ParamType
}
```

### 3. Symbol Resolution

The generator resolves type aliases and follows symbol chains:

```ts
// Type alias chain
type AliasA = AliasB
type AliasB = AliasC
type AliasC = 'final' | 'value'

// Generator follows the chain and includes all aliases
// Handles flattened unions by preserving syntax tree information
```

### 4. Deduplication

Types are deduplicated by symbol to avoid duplicate definitions:

```ts
// Same type referenced multiple times
export interface RouteA {
  user: User  // → Includes User once
}

export interface RouteB {
  author: User  // → User already included, skipped
}
```

## Benefits

### Comprehensive Type Coverage
- **No Missing Types:** All exported types automatically included
- **Flattened Type Support:** Preserves union type aliases that TypeScript flattens
- **Output Type Coverage:** Includes types used only in route outputs
- **Transitive Dependencies:** Discovers types through reference chains

### Improved Developer Experience
- **Zero Configuration:** Works automatically without additional setup
- **Runtime Safety:** Eliminates "type not defined" runtime errors
- **IntelliSense Support:** Full type information available in generated client
- **Refactoring Safety:** Type renames and changes automatically propagated

### Better Type System Integration
- **Syntax Tree Analysis:** Works around TypeScript type checker limitations
- **Export Flexibility:** Supports various export patterns
- **Re-export Support:** Handles complex module structures
- **Generic Type Support:** Preserves generic type parameters and constraints

## Performance Considerations

### Analysis Performance
- **Incremental Processing:** Only analyzes files with routes
- **Symbol Deduplication:** Prevents redundant type processing
- **Efficient Crawling:** Optimized syntax tree traversal
- **Caching:** Symbol resolution results cached during analysis

### Generated Output Size
- **Selective Inclusion:** Only includes exported types from route files
- **Deduplication:** Prevents duplicate type definitions
- **Tree Shaking:** Unused types can be tree-shaken by bundlers
- **Minimal Overhead:** Type definitions are lightweight

## Migration and Compatibility

### Automatic Migration
- **No Code Changes:** Existing code works without modification
- **Additive Enhancement:** Only adds missing types, doesn't change existing ones
- **Backward Compatible:** Generated clients remain compatible
- **Progressive Enhancement:** Benefits apply immediately upon upgrade

### Best Practices

```ts
// ✅ Good: Export types that might be used in routes
export type Status = 'pending' | 'approved' | 'rejected'
export interface ApiResponse<T> { success: boolean; data: T }

// ✅ Good: Use named exports for better discovery
export { SharedType, CommonInterface } from './shared.js'

// ❌ Avoid: Default exports for types (not discovered)
export default interface User { id: string }

// ❌ Avoid: Non-exported types used in routes
type InternalStatus = 'draft' | 'published'  // Should be exported
export const publishContent = defineRoute({
  handler: async (p, s, body: { status: InternalStatus }) => { ... }
})
```

## Troubleshooting

### Common Issues

**Issue:** Type still missing from generated output
```ts
// Problem: Type not exported
type Status = 'active' | 'inactive'  // Missing 'export'

export const updateStatus = defineRoute({
  handler: async (p, s, body: { status: Status }) => { ... }
})

// Solution: Export the type
export type Status = 'active' | 'inactive'
```

**Issue:** Circular type references
```ts
// Problem: Circular references might cause issues
export interface User {
  id: string
  organization: Organization
}

export interface Organization {
  id: string
  users: User[]  // Circular reference
}

// Solution: The generator handles this automatically with deduplication
// No action needed - both types will be included correctly
```

**Issue:** Generic type parameters missing
```ts
// Problem: Generic constraints not preserved
export interface Repository<T extends BaseEntity> {
  find(id: string): Promise<T>
}

// Solution: The generator preserves generic constraints automatically
// Generated output will include: Repository<T extends BaseEntity>
```

### Debugging Type Discovery

```ts
// Enable debug logging to see type discovery process
// Set DEBUG=alien-rpc:* when running the generator

// Check generated output for included types
// Look for type definitions at the top of generated client files

// Verify exports in source files
// Ensure types are properly exported with 'export' keyword
```

## Future Enhancements

### Planned Features
- **Cross-File Type Discovery:** Include types from imported modules
- **Conditional Type Support:** Better handling of conditional types
- **Mapped Type Support:** Enhanced support for mapped types
- **Type Validation:** Runtime type validation for included types

### Potential Improvements
- **Smart Filtering:** Only include types actually used in routes
- **Bundle Optimization:** Generate separate type bundles for large projects
- **Documentation Generation:** Generate type documentation alongside client
- **IDE Integration:** Enhanced IDE support for discovered types

## Technical Details

### Files Modified

**`packages/generator/src/project/analyze-file.ts`** (40 lines added)
- Enhanced file analysis to process all exported declarations
- Added support for export declarations and named exports
- Integrated type collection with route analysis

**`packages/generator/src/project/type-nodes.ts`** (165 lines added)
- New comprehensive type collection system
- Syntax tree crawling for type discovery
- Support for all TypeScript type constructs
- Symbol resolution and alias handling

**`packages/generator/src/project/analyze-route.ts`** (23 lines modified)
- Updated route analysis to work with new type collection
- Improved integration with type reference tracking

**`packages/generator/src/project/type-printer.ts`** (24 lines modified)
- Enhanced type printing with symbol stack tracking
- Better handling of complex type hierarchies

**`packages/generator/src/project/type-references.ts`** (161 lines modified)
- Improved type reference resolution
- Enhanced symbol tracking and deduplication

**`packages/generator/src/project/utils.ts`** (21 lines modified)
- Enhanced export detection for export declarations
- Improved library symbol detection
- Better utility function organization

## References

**External Documentation:**
- [TypeScript Compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [TypeScript AST Viewer](https://ts-ast-viewer.com/)
- [TypeScript Type Checker](https://github.com/microsoft/TypeScript/wiki/Using-the-Type-Checker)
- [Symbol and Type System](https://github.com/microsoft/TypeScript/wiki/Architectural-Overview#type-checker)

**Related Changes:**
- [Allow Relative prefixUrl](./2025-07-19_c96e973_allow-relative-prefix-url.md) (Previous)
- [Sourcemap Support](./2025-05-20_a1a6dfa_sourcemap-support.md) (Related)

**Files Modified:**
- `packages/generator/src/project/analyze-file.ts` - Enhanced export analysis
- `packages/generator/src/project/type-nodes.ts` - New type collection system
- `packages/generator/src/project/analyze-route.ts` - Updated route analysis integration
- `packages/generator/src/project/type-printer.ts` - Enhanced type printing
- `packages/generator/src/project/type-references.ts` - Improved type reference resolution
- `packages/generator/src/project/utils.ts` - Enhanced utility functions

This enhancement significantly improves the reliability and completeness of generated alien-rpc clients by ensuring all relevant types are automatically discovered and included.

## Open Questions

No unanswered questions