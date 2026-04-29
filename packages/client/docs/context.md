# Overview

`@alien-rpc/client` consumes a generated route manifest and returns a typed
client object with the same shape. HTTP routes become fetch-backed functions,
websocket routes become functions backed by a shared websocket connection, and
streaming routes expose `ResponseStream`.

# When to Use

Use this package in browser, worker, or server code that calls an alien-rpc API
from a generated `clientOutFile`.

Use `defineClientFactory` when you want to publish a pre-bound client factory
for one generated route manifest and let callers provide request options later.

# When Not to Use

Do not hand-write large route manifests. Route manifests are generated so route
names, parameter types, result formats, and websocket metadata stay aligned with
service route modules.

Do not use `buildRouteURL` or `getRouteFromFunction` with websocket routes.
Those helpers operate on generated HTTP route functions.

# Mental Model

`defineClient(routes, options)` builds a proxy around the generated manifest.
When a route property is accessed, the client resolves the route protocol and
caches a callable function for that property.

For HTTP routes, path parameters are placed into the route path and remaining
parameters become query data for bodyless methods or JSON bodies for bodyful
methods. Request hooks run around the fetch response, retry policy is applied
before an `HTTPError` is thrown, and `errorMode` controls whether failures
reject or return an error tuple.

For websocket routes, all generated websocket functions share the client's
connection to the `ws` endpoint under `prefixUrl`. Request-style websocket
routes may receive an abort signal as their final argument.

JSON text sequence routes return a stream with `toArray()`, `nextPage()`, and
`previousPage()` support when the server sends pagination directives.

# Entry Points

- `@alien-rpc/client`: `defineClient`, `defineClientFactory`, error classes,
  route metadata helpers, route/client types, request options, hooks, and
  streaming types.
- `@alien-rpc/client/formats/json`: default JSON response parser.
- `@alien-rpc/client/formats/json-seq`: response parser for JSON text
  sequences and paginated async-generator results.
- `@alien-rpc/client/protocols/http`: default HTTP route protocol.
- `@alien-rpc/client/protocols/websocket`: protocol runtime used by generated
  websocket route entries.

# API Reference

Exact signatures are emitted to `dist/index.d.ts`,
`dist/formats/*.d.ts`, and `dist/protocols/*.d.ts` during the package build.
Factual behavior belongs in source TSDoc next to the exported symbols.
