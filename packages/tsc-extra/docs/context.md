# Overview

`tsc-extra` is a small TypeScript compiler API wrapper for tools that need a
project model, source-file registry, TypeScript program, language service, and
diagnostic formatting without re-implementing the same setup each time.

# When to Use

Use `createProject()` when a tool needs to load a `tsconfig.json`, inspect or
update source files, resolve dependencies, and ask TypeScript for type
information.

Use `createProjectFactory()` when a package wants to add tool-specific helpers
to the base project object while reusing the compiler setup.

# When Not to Use

Do not use this package as a build system or replacement for `tsc`. Its
`writeFile` host path is intentionally not an emit workflow.

Do not assume it uses the workspace TypeScript package. `getCompiler()` resolves
TypeScript from the caller-provided root directory.

# Mental Model

`createProject(rootDir, options)` resolves TypeScript, parses the configured
`tsconfig.json`, creates a document registry, and exposes helpers for source
files, programs, language services, module resolution, dependency collection,
and diagnostics.

Source files can be added, created, updated, removed, and queried by file name,
path, or predicate. Programs and language services are created lazily; call
`createProgram()` when you need a fresh program after source-file changes.

`TsConfig` extends TypeScript's parsed command line with discovered directories
so tools can track configuration and file-system inputs.

# API Reference

Exact signatures are emitted to `dist/index.d.ts` during the package build.
Factual behavior belongs in source TSDoc next to `ProjectOptions`,
`createProject`, `createProjectFactory`, and exported errors.
