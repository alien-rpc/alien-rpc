# Phase Two Documentation Plan

## Current Documentation Structure Analysis

The existing documentation is scattered across multiple README files in individual packages:

- **Main Package (`alien-rpc`)**: Basic overview, installation, CLI usage, and limitations
- **Service Package**: Comprehensive guide on route definition, validation, streaming, error handling
- **Client Package**: Client configuration, options, and usage patterns
- **Generator Package**: Minimal documentation ("Further documentation is forthcoming")
- **Additional Docs**: HTTP errors and type constraints in service/docs/

## Recommended Approach: **Rewrite**

The current documentation structure is fragmented across package READMEs, making it difficult for users to get a complete picture of alien-rpc. A rewrite is justified because:

1. **Fragmentation**: Critical information is scattered across 4+ separate README files
2. **Inconsistent Structure**: Each package README follows different organization patterns
3. **Missing Integration**: No unified guide showing how all packages work together
4. **Feature Updates**: 60+ feature updates need to be integrated into cohesive documentation
5. **User Journey**: Current structure doesn't follow logical learning progression

## Proposed Documentation Structure

The new documentation will be organized in the root `./docs` folder with the following structure:

### Core Documentation Files

1. **README.md** - Project overview, quick start, and navigation
2. **getting-started.md** - Installation, basic setup, first API
3. **defining-routes.md** - Route definition, HTTP methods, path patterns
4. **validation.md** - Type constraints, runtime validation, custom formats
5. **client.md** - Client configuration, usage, options, hooks
6. **streaming.md** - JSON streaming, WebSocket support, pagination
7. **error-handling.md** - HTTP errors, custom errors, error modes
8. **cli-reference.md** - Generator CLI options, configuration, watch mode
9. **middleware.md** - Route middleware, request/response manipulation
10. **deployment.md** - Production setup, adapters, performance
11. **migration.md** - Breaking changes, upgrade guides
12. **api-reference.md** - Complete API documentation

### Supporting Files

- **examples/** - Complete working examples
- **troubleshooting.md** - Common issues and solutions
- **changelog.md** - Consolidated feature updates and changes

## Integration Strategy

### Feature Updates Integration

The 60+ feature update files will be integrated as follows:

- **Core Features**: Integrated into main documentation sections
- **Configuration Options**: Consolidated in cli-reference.md and client.md
- **Breaking Changes**: Documented in migration.md with upgrade paths
- **Examples**: Enhanced examples throughout all documentation
- **API Changes**: Updated in api-reference.md

### Content Migration

- **Service README**: Primary source for routes, validation, streaming sections
- **Client README**: Foundation for client.md
- **Main README**: Basis for getting-started.md and overview
- **Type Constraints**: Enhanced and moved to validation.md
- **HTTP Errors**: Enhanced and moved to error-handling.md

### Stub Files

Old package README files will be replaced with stubs linking to the new documentation:

```markdown
# @alien-rpc/service

📚 **Documentation has moved!** 

Please see the [alien-rpc documentation](../../docs/README.md) for comprehensive guides:

- [Defining Routes](../../docs/defining-routes.md)
- [Validation](../../docs/validation.md)
- [Streaming](../../docs/streaming.md)
- [Error Handling](../../docs/error-handling.md)

For quick reference, see the [API Reference](../../docs/api-reference.md).
```

## Implementation Plan

1. **Create new documentation structure** in `./docs/`
2. **Migrate and enhance content** from existing READMEs
3. **Integrate feature updates** into appropriate sections
4. **Create comprehensive examples**
5. **Replace package READMEs** with navigation stubs
6. **Update all internal links** to point to new structure

## Benefits of This Approach

- **Unified Experience**: Single location for all documentation
- **Logical Progression**: Structured learning path for new users
- **Comprehensive Coverage**: All features documented in context
- **Maintainable**: Easier to keep documentation current
- **Discoverable**: Better organization and cross-referencing
- **Complete**: Integration of all 60+ feature updates

This rewrite will transform alien-rpc from having fragmented package-specific documentation to having a comprehensive, user-friendly documentation site that guides users from initial setup through advanced usage patterns.