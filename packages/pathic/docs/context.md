# Overview

`pathic` handles the path-pattern pieces used by alien-rpc: extracting parameter
names, building concrete paths from parameter objects, matching request paths
against a set of route patterns, and deriving path parameter types from string
literals.

# When to Use

Use `pathic` when you need lightweight path matching without a full router, or
when you need the same path-template semantics used by alien-rpc.

Use the type helpers when route path literals should drive parameter object or
tuple types.

# When Not to Use

Do not use `pathic` as an HTTP framework. It does not parse methods, headers,
bodies, middleware, status handling, or adapter-specific request objects.

Do not rely on unnamed wildcard captures when you need a parameter value back.
Use named parameters for values that callers must read or build.

# Pattern Model

Patterns are slash-delimited paths with static segments and dynamic parameters.

- `:name` captures one path segment.
- `*name` captures across path segments.
- Arrays passed to `buildPath` are joined with `/`.
- Missing build parameters throw an error.

`compilePaths` accepts unsorted patterns and returns a matcher. The matcher
prefers more specific static prefixes before broader dynamic patterns, then
invokes the callback with the original pattern index and captured parameters.

`parsePathParams` returns the parameter names in a path pattern. Type helpers
such as `InferParams`, `InferParamsArray`, `InferParamNames`, and
`PathTemplate` perform equivalent compile-time work for path string literals.

# Examples

- `examples/match-and-build.ts`: matches a path, builds a path from typed
  parameters, and parses parameter names.

# API Reference

Exact signatures are emitted to `dist/index.d.ts` during the package build.
Factual behavior belongs in source TSDoc next to the exported functions and
types.
