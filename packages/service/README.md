# @alien-rpc/service

Service-side route definition and request handling runtime for alien-rpc.

## Installation

```sh
npm install @alien-rpc/service @sinclair/typebox@0.34 alien-middleware
```

Use TypeBox v0.34.x with the service runtime.

Install `alien-ws` as well when compiling websocket routes.

## Minimal Use

Define routes in source modules:

```ts
import { route } from '@alien-rpc/service'

export const hello = route('/hello/:name').get(async name => {
  return { message: `Hello, ${name}!` }
})
```

Compile the generated server manifest in your adapter layer:

```ts
import { chain } from 'alien-middleware'
import { compileRoutes } from '@alien-rpc/service'
import routes from './server/generated/api.js'

export default chain(
  compileRoutes(routes, {
    prefix: '/api/',
  })
)
```

## Documentation

- Concepts and lifecycle: [docs/context.md](docs/context.md)
- Runnable example: [examples/route-handler.ts](examples/route-handler.ts)
- Exact public signatures: generated `dist/index.d.ts`
- Optional entrypoint signatures: generated `dist/typebox.d.ts` and
  `dist/formats.d.ts`
- Source-owned API behavior: `src/route.ts`, `src/compileRoutes.ts`,
  `src/response.ts`, `src/pagination.ts`, and `src/websocket.ts`

## Public Entry Points

```ts
import { compileRoutes, paginate, route, ws } from '@alien-rpc/service'
import type {
  RouteDefinition,
  RouteIterator,
  RouteResult,
} from '@alien-rpc/service'
```

```ts
import { ArrayParam, DateString, NumberParam } from '@alien-rpc/service/typebox'
import { addStringFormat } from '@alien-rpc/service/formats'
```
