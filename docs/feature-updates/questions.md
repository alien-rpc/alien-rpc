# High-Severity Questions

This file consolidates all high-severity questions from feature documentation that require attention or clarification.

## Critical Questions

### ResponseStream toArray() Method (2024-11-11)
**Feature:** [Add toArray() method to ResponseStream](./2024-11-11_edbd0d9_add-toarray-method-to-responsestream.md)

- What is the exact signature of toArray(): `Promise<T[]>` or `Promise<Array<T>>`?
- Does toArray() throw errors or integrate with errorMode to return `T[] | Error`?
- Can I call toArray() multiple times on the same ResponseStream instance?
- How do I handle memory issues when the stream contains millions of items?

### Route Declaration Rework (2025-01-02)
**Feature:** [Route Declaration Rework](./2025-01-02_30be627_rework-route-declaration.md)

- What are the exact TypeScript type signatures for RouteFactory and RouteBuilder, and how do they ensure type safety?
- How does TypeScript infer parameter types from path patterns like `/users/:id` or `/groups/:groupId/users/:userId` in the new syntax?
- What happens to TypeScript inference when using middleware with the new route declaration syntax?
- Are there breaking changes to existing TypeScript type definitions that affect client code generation?

### Client Hooks Function (2024-12-21)
**Feature:** [Client Hooks Function Support](./2024-12-21_add33fa_hooks-function.md)

- What is the exact type signature of the Client instance passed to the hooks function and what properties are guaranteed to be available?
- Can the hooks function return a Promise, and if not, how should async hook setup be handled?
- What happens to TypeScript inference when mixing static hooks with function-based hooks through client.extend()?

### TypeScript Package Usage (2024-12-07)
**Feature:** [Use Local TypeScript Package for Type Checking](./2024-12-07_2f786dd_use-local-typescript-package-for-type-checking.md)

- How does the generator handle version mismatches between local and global TypeScript installations?
- What happens when the local TypeScript version is incompatible with the generator's requirements?
- How are TypeScript compiler options resolved when using a local installation?

### Import Resolution Caching (2024-12-09)
**Feature:** [Cache Import Resolutions](./2024-12-09_e89a102_cache-import-resolutions.md)

- How does the cache handle dynamic imports or conditional module loading?
- What happens when cached resolutions become stale due to file system changes?
- How does the cache interact with TypeScript's module resolution strategy?

### Generator Info Events (2024-12-09)
**Feature:** [Add Info Event to Generator](./2024-12-09_4bcf130_add-info-event-to-generator.md)

- What is the exact structure and timing of info events during the generation process?
- How do info events interact with existing warning and error event handlers?
- Can info events be filtered or configured based on verbosity levels?

### TSConfig Handling (2024-12-09)
**Feature:** [Improved TSConfig Handling](./2024-12-09_da22743_improved-tsconfig-handling.md)

- How does the generator resolve conflicting TypeScript compiler options between multiple tsconfig files?
- What happens when tsconfig.json contains paths that don't exist or are inaccessible?
- How are TypeScript project references handled in monorepo scenarios?

### Type Aliases with Client Routes (2024-11-01)
**Feature:** [Include Type Aliases with Client Routes](./2024-11-01_e0e7392_include-type-aliases-with-client-routes.md)

- How does the generator determine which type aliases should be included in client output?
- What happens when type aliases have circular dependencies or complex inheritance chains?
- How are generic type aliases with constraints handled in client generation?

### Error Mode Option (2024-11-11)
**Feature:** [Add ErrorMode Option](./2024-11-11_58ca1cc_add-errormode-option.md)

- How does errorMode interact with existing error handling mechanisms in the client?
- What happens when errorMode is set to 'return' but the route throws non-Error objects?
- How are TypeScript types affected when switching between 'throw' and 'return' error modes?

### JSON Sequence Error Forwarding (2024-12-19)
**Feature:** [JSON Sequence Error Forwarding](./2024-12-19_340045e_json-seq-error-forwarding.md)

- How does error forwarding handle malformed JSON sequences or parsing errors?
- What happens when the client receives partial JSON sequence data before an error?
- How are streaming errors differentiated from application-level errors in JSON sequences?

## High Priority Questions

### ResponseStream toArray() Method (2024-11-11)
**Feature:** [Add toArray() method to ResponseStream](./2024-11-11_edbd0d9_add-toarray-method-to-responsestream.md)

- Does toArray() preserve TypeScript generics from the original route return type?
- What happens if the stream encounters an error midway: partial array or complete failure?
- How do I cancel a toArray() operation that's taking too long?
- Does toArray() work with paginated responses or only single-page streams?

### Route Declaration Rework (2025-01-02)
**Feature:** [Route Declaration Rework](./2025-01-02_30be627_rework-route-declaration.md)

- How do the new RouteBuilder types handle different path patterns (fixed, single parameter, multi-parameter)?
- What are the TypeScript constraints for middleware composition using the new `route.use()` chaining?
- How does the new syntax affect TypeScript inference for route handler return types?
- What TypeScript utilities are available for testing routes declared with the new syntax?

### Client Hooks Function (2024-12-21)
**Feature:** [Client Hooks Function Support](./2024-12-21_add33fa_hooks-function.md)

- How does TypeScript handle the union type between static hooks and function-based hooks in ClientOptions?
- What are the type constraints for the hooks function parameter and return value?
- How does middleware type information flow through to the hooks function's client parameter?

### Error Mode Option (2024-11-11)
**Feature:** [Add ErrorMode Option](./2024-11-11_58ca1cc_add-errormode-option.md)

- How does the errorMode option affect TypeScript inference for route return types?
- What are the performance implications of using 'return' vs 'throw' error modes?
- How should existing error handling code be migrated when switching error modes?

### JSON Sequence Error Forwarding (2024-12-19)
**Feature:** [JSON Sequence Error Forwarding](./2024-12-19_340045e_json-seq-error-forwarding.md)

- How does error forwarding affect client-side error handling patterns?
- What are the TypeScript implications for error types in JSON sequence responses?
- How should applications handle both streaming and application errors simultaneously?

---

*This file is automatically maintained. Questions are extracted from feature documentation and consolidated here for easier tracking and resolution.*