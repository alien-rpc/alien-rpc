# API Reference

Complete API documentation for all alien-rpc packages and their exports.

## Package Overview

- **`alien-rpc`** - Main umbrella package with CLI and re-exports
- **`@alien-rpc/client`** - Type-safe HTTP client
- **`@alien-rpc/service`** - Server-side route definitions
- **`@alien-rpc/generator`** - Code generator
- **`@alien-rpc/route`** - Route utilities and types
- **`pathic`** - Path pattern matching

## Main Package (`alien-rpc`)

### Exports

```ts
// Client exports
import { defineClient, HTTPError, TimeoutError } from 'alien-rpc/client'

// Service exports
import { route, ws, compileRoute, compileRoutes } from 'alien-rpc/service'

// Generator exports
import generator, { Options } from 'alien-rpc/generator'

// Configuration
import { defineConfig, UserConfig } from 'alien-rpc/config'

// Middleware
import { chain, type Middleware } from 'alien-rpc/middleware'
```

### CLI

```bash
alien-rpc [include-patterns...] [options]
```

See [CLI Reference](./cli-reference.md) for complete documentation.

## Client Package (`@alien-rpc/client`)

### Core Functions

#### `defineClient<API, TErrorMode>(routes, options?)`

Creates a type-safe client instance.

```ts
function defineClient<
  API extends ClientRoutes,
  TErrorMode extends ErrorMode = 'reject'
>(
  routes: API,
  options?: ClientOptions<TErrorMode>
): Client<API, TErrorMode>
```

**Parameters:**
- `routes` - Generated API routes object
- `options` - Client configuration options

**Returns:** Type-safe client with methods for each route

#### `buildRouteURL(routeFunction, params?)`

Builds a URL for a route function.

```ts
function buildRouteURL<TRoute>(
  routeFunction: Function & RouteTypeInfo<TRoute>,
  params?: Route.inferParams<TRoute>
): string
```

#### `getRouteFromFunction<TRoute>(routeFunction)`

Extracts route metadata from a route function.

```ts
function getRouteFromFunction<TRoute extends Route>(
  routeFunction: Function & RouteTypeInfo<TRoute>
): TRoute
```

### Types

#### `ClientOptions<TErrorMode>`

Configuration options for the client.

```ts
interface ClientOptions<TErrorMode extends ErrorMode = ErrorMode> {
  // Base URL for requests
  prefixUrl?: string
  
  // Default headers
  headers?: HeadersInit
  
  // Request timeout in milliseconds
  timeout?: number
  
  // Custom fetch implementation
  fetch?: typeof fetch
  
  // Error handling mode
  errorMode?: TErrorMode
  
  // Request/response hooks
  hooks?: {
    beforeRequest?: Array<(request: Request) => Request | void | Promise<Request | void>>
    afterResponse?: Array<(response: Response) => Response | void | Promise<Response | void>>
  }
  
  // Retry configuration
  retry?: {
    limit?: number
    methods?: string[]
    statusCodes?: number[]
    delay?: (attemptCount: number) => number
  }
  
  // WebSocket configuration
  ws?: {
    protocols?: string[]
    pingInterval?: number
    idleTimeout?: number
  }
}
```

#### `Client<API, TErrorMode>`

The client instance type.

```ts
type Client<
  API extends ClientRoutes = any,
  TErrorMode extends ErrorMode = ErrorMode
> = {
  readonly fetch: (path: string, options?: FetchOptions) => Promise<Response>
  readonly options: Readonly<ResolvedClientOptions<TErrorMode>>
  ws?: WebSocket
  
  extend<TNewErrorMode extends ErrorMode = TErrorMode>(
    defaults: ClientOptions<TNewErrorMode>
  ): Client<API, TNewErrorMode>
} & RouteFunctions<API, TErrorMode>
```

#### `ErrorMode`

Determines how errors are handled.

```ts
type ErrorMode = 'reject' | 'return'
```

- `'reject'` - Errors throw/reject promises (default)
- `'return'` - Errors return as `[Error, undefined]` tuples

#### `Route<THandler>`

Route metadata type.

```ts
interface Route<THandler extends (...args: any[]) => any = any> {
  path: string
  method: string
  arity: number
  format?: 'json' | 'response' | 'stream'
}
```

### Error Types

#### `HTTPError`

HTTP response errors.

```ts
class HTTPError extends Error {
  name: 'HTTPError'
  response: Response
  request: Request
  options: FetchOptions
}
```

#### `TimeoutError`

Request timeout errors.

```ts
class TimeoutError extends Error {
  name: 'TimeoutError'
  request: Request
}
```

#### `RequestError`

General request errors.

```ts
class RequestError extends Error {
  name: 'RequestError'
  request: Request
}
```

### WebSocket Types

#### `ws.RequestOptions`

```ts
interface RequestOptions {
  signal?: AbortSignal
}
```

#### `ws.RequestError`

```ts
interface RequestError extends Error {
  name: 'ws.RequestError'
  code: number
  data: unknown
}
```

#### `ws.ConnectionError`

```ts
interface ConnectionError extends Error {
  name: 'ws.ConnectionError'
}
```

## Service Package (`@alien-rpc/service`)

### Core Functions

#### `route`

The main route factory for defining HTTP routes.

```ts
const route: RouteFactory<never>
```

**Usage:**
```ts
// Basic route
export const getUser = route.get('/users/:id', async (id: number) => {
  return { id, name: 'John' }
})

// Route with middleware
const authRoute = route.use([authMiddleware])
export const getProfile = authRoute.get('/profile', async (ctx) => {
  return ctx.user
})

// WebSocket route
export const chatSocket = route.ws(async (ctx) => {
  // WebSocket handler
})
```

#### `ws`

WebSocket route utilities.

```ts
const ws: {
  RouteDefinition: typeof RouteDefinition
  RequestContext: typeof RequestContext
  RouteResult: typeof RouteResult
}
```

#### `compileRoute(route, options?)`

Compiles a single route for runtime use.

```ts
function compileRoute(
  route: RouteDefinition,
  options?: CompileOptions
): CompiledRoute
```

#### `compileRoutes(routes, options?)`

Compiles multiple routes for runtime use.

```ts
function compileRoutes(
  routes: RouteDefinition[],
  options?: CompileOptions
): CompiledRoute[]
```

#### `paginate(iterator, options?)`

Creates paginated responses for streaming.

```ts
function paginate<T>(
  iterator: AsyncIterable<T>,
  options?: PaginationOptions
): AsyncGenerator<T, PaginationLinks>
```

### Types

#### `RouteFactory<TMiddleware>`

Factory for creating routes with middleware.

```ts
interface RouteFactory<T extends MiddlewareChain> {
  // HTTP methods (lowercase)
  get: RouteMethodBuilder<'GET', T>
  post: RouteMethodBuilder<'POST', T>
  put: RouteMethodBuilder<'PUT', T>
  patch: RouteMethodBuilder<'PATCH', T>
  delete: RouteMethodBuilder<'DELETE', T>
  options: RouteMethodBuilder<'OPTIONS', T>
  head: RouteMethodBuilder<'HEAD', T>
  
  // HTTP methods (uppercase)
  GET: RouteMethodBuilder<'GET', T>
  POST: RouteMethodBuilder<'POST', T>
  PUT: RouteMethodBuilder<'PUT', T>
  PATCH: RouteMethodBuilder<'PATCH', T>
  DELETE: RouteMethodBuilder<'DELETE', T>
  OPTIONS: RouteMethodBuilder<'OPTIONS', T>
  HEAD: RouteMethodBuilder<'HEAD', T>
  
  // Path-based route creation
  <TPath extends string>(path: TPath): RouteBuilder<TPath, T>
  
  // WebSocket routes
  ws: <TArgs extends [...any[], ws.RequestContext<T>], TResult extends ws.RouteResult>(
    handler: (...args: TArgs) => TResult
  ) => ws.RouteDefinition
  
  // Middleware composition
  use: <TMiddleware extends ExtractMiddleware<T>>(
    middleware: TMiddleware
  ) => RouteFactory<ApplyMiddleware<T, TMiddleware>>
}
```

#### `RouteBuilder<TPath, TMiddleware>`

Builder for specific route paths.

```ts
type RouteBuilder<TPath extends string, TMiddleware extends MiddlewareChain> = {
  [TMethod in RouteMethod | Lowercase<RouteMethod>]: 
    TPath extends MultiParamRoutePath
      ? MultiParamRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
      : TPath extends SingleParamRoutePath
        ? SingleParamRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
        : FixedRouteBuilder<TPath, Uppercase<TMethod>, TMiddleware>
}
```

#### `RouteDefinition`

Route definition metadata.

```ts
interface RouteDefinition {
  method: RouteMethod
  path: string
  handler: (...args: any[]) => any
  middleware?: MiddlewareChain
}
```

#### `RequestContext`

Request context passed to route handlers.

```ts
type RequestContext = MiddlewareContext<any> & {
  request: Request
  url: URL
  params: Record<string, string>
  // Additional context from middleware
}
```

### Route Handler Types

#### `FixedRouteHandler<TPath, TData, TContext, TResult>`

Handler for routes without path parameters.

```ts
type FixedRouteHandler<
  TPath extends string,
  TData extends object,
  TContext,
  TResult extends RouteResult
> = (data: TData, context: TContext) => TResult
```

#### `SingleParamRouteHandler<TPath, TParam, TData, TContext, TResult>`

Handler for routes with one path parameter.

```ts
type SingleParamRouteHandler<
  TPath extends SingleParamRoutePath,
  TParam extends PathParam,
  TData extends object,
  TContext,
  TResult extends RouteResult
> = (param: TParam, data: TData, context: TContext) => TResult
```

#### `MultiParamRouteHandler<TPath, TParams, TData, TContext, TResult>`

Handler for routes with multiple path parameters.

```ts
type MultiParamRouteHandler<
  TPath extends MultiParamRoutePath,
  TParams extends InferParamsArray<TPath, PathParam>,
  TData extends object,
  TContext,
  TResult extends RouteResult
> = (...args: [...TParams, TData, TContext]) => TResult
```

### Validation Types (`t` namespace)

Type constraints for runtime validation.

```ts
declare namespace t {
  // String constraints
  interface minLength<N extends number> {}
  interface maxLength<N extends number> {}
  interface length<N extends number> {}
  interface pattern<P extends string> {}
  interface format<F extends string> {}
  interface contentEncoding<E extends string> {}
  interface contentMediaType<T extends string> {}
  
  // Number constraints
  interface minimum<N extends number> {}
  interface maximum<N extends number> {}
  interface exclusiveMinimum<N extends number> {}
  interface exclusiveMaximum<N extends number> {}
  interface multipleOf<N extends number> {}
  
  // Array constraints
  interface minItems<N extends number> {}
  interface maxItems<N extends number> {}
  interface uniqueItems {}
  
  // Object constraints
  interface minProperties<N extends number> {}
  interface maxProperties<N extends number> {}
  interface additionalProperties<T> {}
  
  // Date constraints
  interface minimumTimestamp<N extends number> {}
  interface maximumTimestamp<N extends number> {}
}
```

### Response Utilities

#### JSON Streaming

```ts
// Create JSON stream
function* streamData() {
  yield { id: 1, name: 'Item 1' }
  yield { id: 2, name: 'Item 2' }
}

export const getItems = route.get('/items', async function* () {
  yield* streamData()
})
```

#### Custom Responses

```ts
export const downloadFile = route.get('/files/:id', async (id: number) => {
  const file = await getFile(id)
  return new Response(file.content, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.name}"`
    }
  })
})
```

## Generator Package (`@alien-rpc/generator`)

### Main Function

#### `default(options)`

Creates a generator instance.

```ts
function default(options: Options): Generator
```

### Types

#### `Options`

Generator configuration options.

```ts
interface Options {
  include: string[]
  outDir: string
  serverOutFile?: string
  clientOutFile?: string
  tsConfigFile?: string
  versionPrefix?: string
  noFormat?: boolean
}
```

#### `Generator`

Generator instance with event emitter.

```ts
interface Generator {
  events: EventEmitter
  rerun(): Promise<void>
}
```

### Events

```ts
interface GeneratorEvents {
  start: () => void
  finish: () => void
  abort: () => void
  write: (filePath: string) => void
  custom: (event: CustomEvent) => void
}

type CustomEvent = 
  | { type: 'route'; route: AnalyzedRoute }
  | { type: 'warning'; message: string }
  | { type: 'info'; message: string | string[] }
```

## Configuration (`alien-rpc/config`)

### Functions

#### `defineConfig(config)`

Defines configuration with type checking.

```ts
function defineConfig(config: UserConfig): UserConfig
```

### Types

#### `UserConfig`

Configuration file schema.

```ts
interface UserConfig {
  include: string[]
  outDir?: string
  tsConfigFile?: string
  serverOutFile?: string
  clientOutFile?: string
  versionPrefix?: string
  noFormat?: boolean
}
```

## Path Utilities (`pathic`)

### Functions

#### `buildPath(pattern, params)`

Builds a path from pattern and parameters.

```ts
function buildPath<T extends string>(
  pattern: T,
  params: InferParams<T>
): string
```

#### `parsePathParams(pattern)`

Parses path parameters from a pattern.

```ts
function parsePathParams(pattern: string): PathParam[]
```

### Types

#### `InferParams<T>`

Infers parameter types from path pattern.

```ts
type InferParams<T extends string> = 
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & InferParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? { [K in Param]: string }
      : {}
```

#### `PathTemplate`

Path template type.

```ts
type PathTemplate = string
```

## Middleware (`alien-rpc/middleware`)

### Functions

#### `chain(...middleware)`

Chains multiple middleware functions.

```ts
function chain<T extends Middleware[]>(...middleware: T): MiddlewareChain<T>
```

### Types

#### `Middleware<TContext, TNext>`

Middleware function type.

```ts
type Middleware<TContext = any, TNext = any> = (
  context: TContext,
  next: () => TNext
) => TNext | Promise<TNext>
```

#### `MiddlewareChain<T>`

Chained middleware type.

```ts
type MiddlewareChain<T extends Middleware[] = Middleware[]> = {
  middleware: T
  apply<TContext>(context: TContext): Promise<any>
}
```

## Usage Examples

### Basic API Setup

```ts
// routes/users.ts
import { route } from '@alien-rpc/service'

export const getUser = route.get('/users/:id', async (id: number) => {
  return await db.users.findById(id)
})

export const createUser = route.post('/users', async (data: {
  name: string
  email: string
}) => {
  return await db.users.create(data)
})
```

```ts
// client.ts
import { defineClient } from '@alien-rpc/client'
import * as API from './generated/api.js'

const client = defineClient(API, {
  prefixUrl: 'https://api.example.com',
  headers: { 'Authorization': `Bearer ${token}` }
})

// Type-safe API calls
const user = await client.getUser(123)
const newUser = await client.createUser({
  name: 'John Doe',
  email: 'john@example.com'
})
```

### Advanced Features

```ts
// Streaming responses
export const getUsers = route.get('/users', async function* () {
  for await (const user of db.users.stream()) {
    yield user
  }
})

// WebSocket routes
export const chatSocket = route.ws(async (ctx) => {
  ctx.send({ type: 'welcome', message: 'Connected!' })
  
  for await (const message of ctx.messages) {
    // Handle incoming messages
    ctx.broadcast(message)
  }
})

// Middleware
const authMiddleware = (ctx, next) => {
  if (!ctx.headers.authorization) {
    throw new UnauthorizedError('Token required')
  }
  return next()
}

const authRoute = route.use([authMiddleware])
export const getProfile = authRoute.get('/profile', async (ctx) => {
  return ctx.user
})
```

### Error Handling

```ts
// Client with return mode
const client = defineClient(API, { errorMode: 'return' })

const [error, user] = await client.getUser(123)
if (error) {
  console.error('Failed to get user:', error.message)
} else {
  console.log('User:', user)
}

// Custom error handling
const client = defineClient(API, {
  hooks: {
    afterResponse: [async (response) => {
      if (!response.ok) {
        const error = await response.json()
        throw new CustomError(error.message, error.code)
      }
      return response
    }]
  }
})
```

## Migration Guide

See [Migration Guide](./migration.md) for version upgrade instructions.

## See Also

- [Getting Started](./getting-started.md) - Basic setup and usage
- [Defining Routes](./defining-routes.md) - Route definition guide
- [Client Usage](./client.md) - Client configuration and usage
- [CLI Reference](./cli-reference.md) - Command-line tool documentation
- [Examples](./examples/) - Working code samples