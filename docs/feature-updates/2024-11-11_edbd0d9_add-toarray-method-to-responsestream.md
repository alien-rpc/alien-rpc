# Add `toArray` Method to ResponseStream Type

**Commit:** `edbd0d9` (2024-11-11)

## Summary

Adds a `toArray()` method to the `ResponseStream` interface, providing a convenient way to collect all streamed values into an array.

## User-visible Changes

- New `toArray()` method available on all `ResponseStream` instances
- Returns `Promise<T[]>` where `T` is the stream item type
- Automatically collects all yielded values from async generator routes
- No configuration required - method is always available

## Examples

### Basic Usage

```typescript
// Streaming route that yields multiple items
export const listPosts = route.get('/posts', async function* () {
  yield { id: 1, title: 'First post' }
  yield { id: 2, title: 'Second post' }
  yield { id: 3, title: 'Third post' }
})

// Client usage
const stream = await client.listPosts()
const allPosts = await stream.toArray() // [{ id: 1, ... }, { id: 2, ... }, { id: 3, ... }]
```

### Comparison with Manual Collection

```typescript
// Manual iteration
const posts = []
for await (const post of stream) {
  posts.push(post)
}

// Using toArray() method
const posts = await stream.toArray()
```

## Config/Flags

No configuration required. Method is automatically available on all `ResponseStream` instances.

## Breaking/Migration

**Non-breaking**: Additive enhancement that doesn't change existing streaming behavior.

## Tags

- client
- streaming
- responsestream
- async-generators
- convenience-method

## Evidence

- Updated `ResponseStream<T>` interface with `toArray(): Promise<T[]>` method
- Implementation in `packages/client/src/formats/json-seq.ts`
- Uses `for await...of` loop internally to consume stream
- Maintains compatibility with existing pagination methods
