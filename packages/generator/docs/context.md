# Overview

`@alien-rpc/generator` scans TypeScript route modules and emits the generated
files consumed by `@alien-rpc/client` and `@alien-rpc/service`.

It is the source-to-manifest bridge in the alien-rpc stack.

# When to Use

Use this package when a build tool, watcher, or custom integration needs to run
alien-rpc generation without invoking the CLI process.

Use the `alien-rpc` CLI for normal application setup, especially when an
`alien-rpc.config.ts` file is enough.

# When Not to Use

Do not use the generator at request time. Generation is a build-time or watch
time step.

Do not use it to document route APIs manually. Route comments and signatures in
source modules are copied into generated client definitions where applicable.

# Mental Model

The generator receives include globs and project options, loads the TypeScript
project, analyzes exported route definitions, and writes two generated files:

- `clientOutFile`: route metadata and types for `@alien-rpc/client`.
- `serverOutFile`: lazy imports, schemas, formats, and route metadata for
  `@alien-rpc/service`.

The generated files are intentionally source files. They preserve enough type
information for downstream code while keeping runtime route modules lazily
loaded on the server side.

When watch mode is enabled by the caller, the generator tracks files that can
affect route analysis, import resolution, and diagnostics.

# Options

The primary options are `include`, `outDir`, `tsConfigFile`, `serverOutFile`,
`clientOutFile`, `versionPrefix`, `noFormat`, and `verbose`.

Exact option shapes are emitted to `dist/generator.d.ts`; avoid copying those
signatures into prose.

# API Reference

Exact signatures are emitted to `dist/generator.d.ts` during the package build.
Factual behavior belongs in source TSDoc next to the exported `Options` type and
default generator function.
