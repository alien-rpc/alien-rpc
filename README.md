# alien-rpc

## Features

- Type-safe RPC routes with TypeScript and compile-time code generation
- HTTP client powered by [ky](https://github.com/sindresorhus/ky) and a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) wrapper for low memory footprint
- REST semantics with explicitly defined HTTP methods and URIs for each route
- No batched requests or funneling through a single endpoint, allowing for easy debugging and usage tracking
- Request/response validators are auto-generated at compile-time from your TypeScript definitions (powered by [typebox](https://github.com/sinclairzx81/typebox) and [typebox-codegen](https://github.com/sinclairzx81/typebox-codegen))
- Streaming JSON responses powered by [async generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncGenerator) and the [JSON Text Sequence](https://www.rfc-editor.org/rfc/rfc7464.html) RFC
- Express-style “path parameters” (e.g. `/users/:id`) via [path-to-regexp](https://github.com/pillarjs/path-to-regexp)
- Full JSON support in compact query strings via [json-qs](./packages/json-qs)
- Based on [Hattip.js](https://github.com/hattipjs/hattip) for HTTP server and middleware, with adapters for many target platforms

## Guide

### Routes

To define a data-fetching route, import `get` from the `@alien-rpc/service` package.

### Getting Started

Your project needs the following files:

- `schema/`  
  Generated files will appear here. For example, `schema/v1/client-schema.ts` and `schema/v1/server-schema.ts` contain route definitions for version 1 of your API.

  - `schema/package.json`  
    This should contain a `version` field representing the current version of your API.

- `server/routes.ts`  
  Define your API routes here. Alternatively, you can use a glob pattern to load routes from a directory, if you prefer splitting your routes into multiple files.

- `server/server.ts`  
  The HTTP server for your API. In this module, you'll be calling `compileRoutes` to generate a Hattip request handler from your API's server-side schema.

- `client/`  
  The client package for your API.

  - `client/client.ts`  
    A client factory generated by alien-rpc, as well as a default client instance (if you define a default base URL). This module is a simple wrapper around `@alien-rpc/client` that automatically injects your API's client-side schema.

#### Installation

In your `server` directory, install the `@alien-rpc/service` package:

```sh
pnpm add @alien-rpc/service
```

In your `client` directory, install the `@alien-rpc/client` package:

```sh
pnpm add @alien-rpc/client
```

## Development

- It's recommended to run your server with [vite-node](https://www.npmjs.com/package/vite-node) during development, so that you can hot reload your server.

## Limitations

- Routes must return JSON-compatible types, an iterator that yields JSON-compatible types, or a `Response` object.
- Recursive types are forbidden in route signatures.
