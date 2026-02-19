# Codemap

This document maps the supported features of `alien-rpc` to the critical modules that implement them.

## HTTP Routes
- **Route Definition**: `packages/service/src/route.ts` provides the `route` factory and `RouteBuilder` interface.
- **Route Compilation**: `packages/service/src/compileRoute.ts` handles the creation of the server-side route handler, including parameter extraction and validation.
- **Route Dispatching**: `packages/service/src/compileRoutes.ts` manages the routing logic, matching incoming requests to their respective handlers.

## Client Generation
- **Generator Core**: `packages/generator/src/generator.ts` is the main entry point for the code generation process.
- **TypeScript Analysis**: `packages/generator/src/project/analyze-file.ts` and `packages/generator/src/project/analyze-route.ts` use the TypeScript compiler API to extract route metadata.
- **TypeBox Transformation**: `packages/generator/src/typebox-codegen/index.ts` converts TypeScript types into TypeBox schemas for runtime validation.

## Middlewares & Context
- **Middleware Engine**: Powered by [`alien-middleware`](https://github.com/alien-rpc/alien-middleware).
- **Service-side Integration**: `packages/service/src/route.ts` manages the middleware chain for each route factory.

## Websockets
- **WS Route Definition**: `packages/service/src/websocket.ts` defines the websocket route structure.
- **Unified Connection**: Powered by [`crossws`](https://crossws.unjs.io/) via [`alien-ws`](https://github.com/alien-rpc/alien-ws).

## Pagination & Streaming
- **Pagination Logic**: `packages/service/src/pagination.ts` provides the `paginate` function for generating previous/next links.
- **JSON-Seq Responder**: `packages/service/src/responders/json-seq.ts` implements the [JSON text sequence](https://datatracker.ietf.org/doc/html/rfc7464) format for efficient streaming.

## Validation & Coercion
- **Parameter Coercion**: `packages/service/src/typebox.ts` contains the TypeBox transforms used for coercing URL and request body parameters.
- **Query Parameter Decoding**: Powered by [`@json-qs/json-qs`](https://github.com/alloc/json-qs), which handles automatic coercion of types like `boolean`, `number`, and `Date` for query parameters.
- **JSON Body Transformation**: `packages/generator/src/generator.ts` generates specialized transforms (e.g., `DateString`) for non-JSON-native types in request bodies.
