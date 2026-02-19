# alien-rpc

A type-safe RPC library for TypeScript that bridges the gap between your server and client with minimal boilerplate and maximum performance.

## Key Features

- **Type-safe by default**: Share types between server and client without manual effort.
- **Automatic Code Generation**: CLI scans your routes and generates client-side calling code and server-side manifests.
- **Validation**: Integrated with [TypeBox](https://github.com/sinclairzx81/typebox) for robust runtime validation using TypeScript types.
- **Middleware Support**: Powered by `alien-middleware` for powerful, type-safe request context propagation.
- **Websocket Support**: First-class support for websockets via `crossws`.
- **Flexible Formats**: Supports JSON, JSON-Seq (for pagination/streaming), and raw Responses.

## Installation

```bash
npm install alien-rpc
```

## Quick Start

### 1. Define a route

Create a file for your routes (e.g., `server/api/hello.ts`):

```typescript
import { route } from 'alien-rpc/service'

// One path parameter
export const hello = route('/hello/:name').get(async (name, {}, ctx) => {
  return { message: `Hello, ${name}!` }
})

// Multiple path parameters
export const multiple = route('/user/:id/post/:postId').get(async ([id, postId], {}, ctx) => {
  return { id, postId }
})

// No path parameters
export const noParams = route('/status').get(async ({}, ctx) => {
  return { ok: true }
})
```

### 2. Generate client & server manifests

Run the `alien-rpc` CLI to scan your routes and generate the necessary manifests:

```bash
npx alien-rpc './server/api/**/*.ts' --clientOutFile ./client/api.ts --serverOutFile ./server/api.ts
```

> [!TIP]
> See [CLI and Configuration](./docs/cli-config.md) for more details.

### 3. Use the client

In your client-side code:

```typescript
import { defineClient } from 'alien-rpc/client'
import routes from './api.ts'

const client = defineClient(routes, {
  prefixUrl: '/api',
})

// Parameters can be passed directly if there's only one path param
const result = await client.hello('World')
console.log(result.message) // "Hello, World!"
```

### 4. Setup the server

Use the generated server manifest to handle incoming requests:

```typescript
import { compileRoutes } from 'alien-rpc/service'
import routes from './server/api.ts'

const handler = compileRoutes(routes, {
  prefix: '/api/'
})

// The handler is a standard middleware function: (ctx: RequestContext) => Promise<Response | undefined>
```

## Core Concepts

### Middlewares and Context

Use `route.use()` to create factories with shared middlewares. Middlewares can provide context (like a database or user session) to your handlers.

```typescript
import { chain } from 'alien-rpc/middleware'
import { route } from 'alien-rpc/service'

const withUser = chain(async (ctx) => {
  const user = await getUser(ctx.request)
  return { user }
})

const userRoute = route.use(withUser)

export const getProfile = userRoute('/me').get(async (_, ctx) => {
  return ctx.user // Type-safe access to user!
})
```

> [!TIP]
> See [Middlewares and Context](./docs/middleware.md) for more details.

### Validation Constraints

Use TypeScript types to define validation rules. The generator automatically converts these to TypeBox schemas.

```typescript
import type { t } from 'alien-rpc/service'

export const updateBio = route('/bio').post(
  async ({ bio }: { bio: string & t.MaxLength<140> }) => {
    // bio is guaranteed to be <= 140 chars
  }
)
```

### Path Parameter Coercion

Path parameters are automatically coerced based on the types defined in your handler's signature. Supported types include `string` and `number`.

```typescript
export const getById = route('/item/:id').get(
  async (id: number) => {
    // id is guaranteed to be a number!
  }
)
```

> [!TIP]
> See [Validation and Coercion](./docs/validation.md) for more details.

### Websockets

Define websocket routes that share the same connection:

```typescript
export const chat = route.ws((ctx) => {
  ctx.on('message', (msg) => {
    ctx.send({ echo: msg })
  })
})
```

> [!TIP]
> See [Websockets](./docs/websockets.md) for more details.

### Pagination and Streaming

Support efficient data transfer for lists and large datasets.

```typescript
export const listItems = route('/items').get(async function* ({ offset = 0 }) {
  const items = await db.items.findMany({ skip: offset, take: 10 })
  for (const item of items) yield item
  return paginate(this, {
    next: { offset: offset + 10 }
  })
})
```

> [!TIP]
> See [Pagination and Streaming](./docs/pagination.md) for more details.

## Configuration

For larger projects, use an `alien-rpc.config.ts` file:

```typescript
import { defineConfig } from 'alien-rpc/config'

export default defineConfig({
  include: ['./server/api/**/*.ts'],
  outDir: './src/generated',
  clientOutFile: 'client.ts',
  serverOutFile: 'server.ts',
})
```

> [!TIP]
> See [CLI and Configuration](./docs/cli-config.md) for more details.

## License

MIT
