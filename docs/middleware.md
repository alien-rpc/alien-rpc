# Middlewares and Context

`alien-rpc` uses `alien-middleware` to provide a powerful, type-safe way to handle request context and side effects.

## The `chain` function

Middlewares are created using the `chain` function. A middleware can return an object that will be merged into the `RequestContext`, making it available to subsequent middlewares and the final route handler.

```typescript
import { chain } from 'alien-rpc/middleware'

export const withDatabase = chain(async (ctx) => {
  const db = await connectToDatabase()
  return { db } // This becomes available in ctx.db
})
```

## Chaining Middlewares

You can compose multiple middlewares together. Each middleware has access to the context provided by previous ones in the chain.

```typescript
export const withUser = withDatabase.use(async (ctx) => {
  // ctx.db is available here!
  const user = await ctx.db.users.find(ctx.request.headers.get('Authorization'))
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  return { user }
})
```

## Creating Route Factories

Instead of applying middleware to every single route, you can create a specialized `route` factory that has the middleware pre-applied.

```typescript
import { route } from 'alien-rpc/service'

// All routes created with userRoute will require a session
export const userRoute = route.use(withUser)

export const getMe = userRoute('/me').get(async (_, ctx) => {
  return ctx.user // Fully type-safe!
})
```

## Middleware Hooks

Middlewares can also use hooks to perform actions at different stages of the request lifecycle.

- `ctx.onResponse(callback)`: Runs after the handler (or a previous middleware) returns a response.
- `ctx.waitUntil(promise)`: Useful for background tasks that shouldn't delay the response.

```typescript
export const withLogging = chain(async (ctx) => {
  const start = Date.now()
  ctx.onResponse(() => {
    console.log(`${ctx.request.method} ${ctx.url.pathname} took ${Date.now() - start}ms`)
  })
})
```
