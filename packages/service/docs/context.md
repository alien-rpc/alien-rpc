# Overview

`@alien-rpc/service` owns the service-side runtime for alien-rpc. It defines
routes, compiles generated server manifests into request handlers, validates
path/query/body data, adapts route results into responses, and supports
pagination and websocket routes.

# When to Use

Use this package in server-side route modules and adapter layers.

Use `route()` in source modules that the generator scans. Use `compileRoutes()`
where the generated `serverOutFile` is connected to an HTTP adapter or
middleware chain.

# When Not to Use

Do not use this package alone as a complete server. It produces request handlers
for a surrounding platform and middleware system.

Do not pass hand-written route manifests to `compileRoutes()` unless they match
the generated `RouteList` shape. The generator normally owns that shape.

# Mental Model

Route source modules export `route('/path').get(handler)` style definitions.
The generator reads those definitions and emits a server manifest with route
names, methods, paths, schemas, result formats, and lazy imports.

`compileRoutes()` groups the generated routes by method, applies optional path
prefix and CORS handling, validates incoming data with TypeBox schemas, imports
the route module lazily, runs middleware, invokes the handler, and returns a
`Response`.

Handler return values determine the response format:

- JSON-codable values are serialized as JSON.
- `Response`-compatible values are passed through.
- Async generators can stream JSON text sequences and return `paginate()` links.

Throwing a `Response` from a handler sends that response. During development,
service error helpers preserve stack traces where possible so client-side
errors can point back to the service source.

# TypeBox Helpers

`@alien-rpc/service/typebox` exports transforms for common coercions:
`NumberParam`, `ArrayParam`, and `DateString`.

`@alien-rpc/service/formats` registers string formats used by generated
validation schemas and exports bundled format regular expressions.

# Websocket Routes

`route.ws()` defines websocket routes that share one client connection. The
generated websocket manifest is compiled by `ws.compileRoutes()` with an
`alien-ws` adapter.

# API Reference

Exact signatures are emitted to `dist/index.d.ts`, `dist/typebox.d.ts`, and
`dist/formats.d.ts` during the package build. Factual behavior belongs in
source TSDoc next to the exported route, compiler, response, pagination, and
websocket symbols.
