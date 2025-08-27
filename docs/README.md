# alien-rpc Documentation

RPC/REST hybrid middleware for Node.js and Bun with type-safe client generation, pure-TypeScript request validation, and JSON streaming.

## Quick Start

```bash
# Install the main package
pnpm add alien-rpc

# Install TypeBox for runtime validation
pnpm add @sinclair/typebox
```

```ts
// Define a route
import { route } from '@alien-rpc/service'

export const getUser = route.get('/users/:id', async (id: number) => {
  return { id, name: 'John Doe', email: 'john@example.com' }
})
```

```bash
# Generate client code
pnpm alien-rpc 'src/api/**/*.ts' --clientOutFile client/api.ts
```

```ts
// Use the generated client
import { defineClient } from '@alien-rpc/client'
import * as API from './client/api.js'

const client = defineClient(API, { prefixUrl: 'http://localhost:3000' })
const user = await client.getUser(123) // Fully type-safe!
```

## Features

- **Type-Safe RPC**: Routes defined in TypeScript with compile-time code generation
- **REST Semantics**: Explicit HTTP methods and URIs for each route
- **Runtime Validation**: Auto-generated validators from TypeScript types
- **JSON Streaming**: Powered by async generators and JSON Text Sequence RFC
- **WebSocket Support**: Real-time bidirectional communication (experimental)
- **Low Memory Footprint**: Proxy-based client with efficient route matching
- **Full JSON Support**: Compact query strings via json-qs
- **Middleware Support**: Built on Hattip.js with adapter ecosystem

## Documentation

### Getting Started
- [**Getting Started**](./getting-started.md) - Installation, setup, and your first API
- [**Defining Routes**](./defining-routes.md) - Route definition, HTTP methods, and path patterns
- [**Client Usage**](./client.md) - Client configuration, options, and usage patterns

### Core Concepts
- [**Validation**](./validation.md) - Type constraints, runtime validation, and custom formats
- [**Streaming**](./streaming.md) - JSON streaming, WebSocket support, and pagination
- [**Error Handling**](./error-handling.md) - HTTP errors, custom errors, and error modes
- [**Middleware**](./middleware.md) - Route middleware and request/response manipulation

### Tools & Deployment
- [**CLI Reference**](./cli-reference.md) - Generator CLI options, configuration, and watch mode
- [**Deployment**](./deployment.md) - Production setup, adapters, and performance
- [**Migration Guide**](./migration.md) - Breaking changes and upgrade paths

### Reference
- [**API Reference**](./api-reference.md) - Complete API documentation
- [**Examples**](./examples/) - Working code samples and patterns
- [**Troubleshooting**](./troubleshooting.md) - Common issues and solutions
- [**Changelog**](./changelog.md) - Feature updates and changes

## Architecture

alien-rpc consists of several packages that work together:

- **`alien-rpc`** - Main package containing CLI, generator, client, and service
- **`@alien-rpc/service`** - Server-side route definition and middleware
- **`@alien-rpc/client`** - Type-safe HTTP client with proxy wrapper
- **`@alien-rpc/generator`** - Code generator for route metadata
- **`@alien-rpc/pathic`** - Efficient route matching and path parameters

## Key Concepts

### Type-Safe Routes

Routes are defined as TypeScript functions with automatic type inference:

```ts
// Path parameters are automatically typed
const getUser = route.get('/users/:id', async (id: number) => {
  return await db.users.findById(id)
})

// Request data is validated at runtime
const createUser = route.post('/users', async (data: {
  name: string
  email: string & t.Format<'email'>
}) => {
  return await db.users.create(data)
})
```

### Generated Client

The generator creates a type-safe client that mirrors your server routes:

```ts
const client = defineClient(API)

// TypeScript knows the exact return type
const user = await client.getUser(123)

// Request data is type-checked
await client.createUser({
  name: 'Jane Doe',
  email: 'jane@example.com'
})
```

### Streaming Responses

Async generators enable efficient JSON streaming:

```ts
const streamPosts = route.get('/posts', async function* () {
  for await (const post of db.posts.findMany()) {
    yield post // Streamed as JSON Text Sequence
  }
})

// Client automatically handles streaming
for await (const post of client.streamPosts()) {
  console.log(post)
}
```

## Community

- **GitHub**: [alloc/alien-rpc](https://github.com/alloc/alien-rpc)
- **Issues**: [Report bugs or request features](https://github.com/alloc/alien-rpc/issues)
- **License**: [MIT](../LICENSE.md)

## Next Steps

1. **New to alien-rpc?** Start with the [Getting Started Guide](./getting-started.md)
2. **Migrating from another framework?** Check the [Migration Guide](./migration.md)
3. **Need examples?** Browse the [Examples Directory](./examples/)
4. **Having issues?** See [Troubleshooting](./troubleshooting.md)

---

> **Note**: This documentation covers alien-rpc v2.x. For older versions, see the package-specific README files in the [packages directory](../packages/).