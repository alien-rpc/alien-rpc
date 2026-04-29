# Overview

`alien-rpc` is the umbrella package for the full RPC stack. It provides the
`alien-rpc` CLI and re-exports the package-level runtime APIs through explicit
subpath entrypoints.

The package does not expose a root module. Import from the subpath that matches
the side of the system you are using.

# When to Use

Use this package when an application wants one dependency that covers route
definition, generated client/server manifests, request handling, middleware
composition, TypeBox helpers, and the generator CLI.

Use the scoped packages directly when a library only needs one layer, such as
`@alien-rpc/client` for generated client manifests or `pathic` for path
matching.

# When Not to Use

Do not use this package as a replacement for an HTTP framework or adapter. The
server runtime expects a request context from the surrounding platform, commonly
through `alien-middleware` and an adapter such as Hattip.

Do not import private files from `dist/` directly. Public imports are the
subpaths declared in `package.json`.

# Mental Model

The stack has three user-facing stages:

1. Route modules export `route()` definitions from `alien-rpc/service`.
2. The CLI or `alien-rpc/generator` scans those modules and emits a client
   manifest plus a server manifest.
3. `alien-rpc/client` consumes the client manifest, while
   `alien-rpc/service` compiles the server manifest into a request handler.

The generated manifests are the contract between the service side and client
side. Runtime behavior is driven by those manifests and by source-level TSDoc on
the underlying scoped packages.

# Entry Points

- `alien-rpc/config`: `defineConfig` and `UserConfig` for
  `alien-rpc.config.ts`.
- `alien-rpc/service`: route definitions, route compilation, responses,
  pagination, JSON helpers, and websocket route support.
- `alien-rpc/service/typebox`: TypeBox transform helpers for path and JSON
  validation.
- `alien-rpc/service/formats`: string format registration and bundled
  validation formats.
- `alien-rpc/client`: generated-manifest client runtime.
- `alien-rpc/client/formats/json-seq`: JSON text sequence response parser.
- `alien-rpc/client/protocols/websocket`: websocket client protocol runtime.
- `alien-rpc/generator`: programmatic route-manifest generator.
- `alien-rpc/middleware`: re-export of `alien-middleware`.

# Examples

- `examples/full-stack.ts`: runs a minimal in-memory route, generated-client
  shape, service handler, and client call using `alien-rpc/*` subpath imports.

# API Reference

Exact exported signatures are emitted during package builds into `dist/**/*.d.ts`.
Treat those declaration files as generated lookup output, not as an authoring
surface.
