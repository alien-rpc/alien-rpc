# Pagination and Streaming

`alien-rpc` supports efficient pagination and streaming using the [JSON text sequence](https://datatracker.ietf.org/doc/html/rfc7464) (json-seq) format.

## Defining a Paged Route

To enable pagination, your route must use the `async function*` syntax and be declared with the `json-seq` format (which is often inferred or explicitly set).

You use the `this` context to call `paginate()`, providing the parameters for the previous and next pages.

```typescript
import { route, paginate } from 'alien-rpc/service'

export const listItems = route('/items').get(async function* ({ offset = 0 }) {
  const items = await db.items.findMany({ skip: offset, take: 10 })

  for (const item of items) {
    yield item
  }

  // Return pagination links at the end
  return paginate(this, {
    prev: offset > 0 ? { offset: Math.max(0, offset - 10) } : null,
    next: items.length === 10 ? { offset: offset + 10 } : null,
  })
})
```

## Consuming the Stream

On the client side, the generated function returns a `ResponseStream`, which is an `AsyncIterable`.

```typescript
import { client } from './api'

const stream = await client.listItems({ offset: 0 })

for await (const item of stream) {
  console.log('Item:', item)
}

// After the stream is consumed, pagination methods become available
if (stream.nextPage) {
  const nextStream = await stream.nextPage()
}
```

## Advantages of `json-seq`

- **Incremental Processing**: The client can start processing items as soon as the first one arrives.
- **Memory Efficient**: Large datasets don't need to be buffered into a single JSON array on either the server or client.
- **Type-safe Links**: Pagination links are generated based on your route's actual parameter types.
