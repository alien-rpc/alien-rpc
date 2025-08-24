# Add `toArray` Method to ResponseStream Type

## Commit Metadata

- **Full SHA**: edbd0d93a6893b75e0179237a5ddc1c23c6f26a3
- **Author**: Alec Larson <1925840+aleclarson@users.noreply.github.com>
- **Date**: Mon Nov 11 08:33:02 2024 -0500
- **Short SHA**: edbd0d9

## Summary

Adds a `toArray()` method to the `ResponseStream` interface, providing a convenient way to collect all streamed values into an array.

## User Impact

**Audience**: Developers using streaming routes (async generator routes)

**Default Behavior**: The `toArray()` method is automatically available on all `ResponseStream` instances

**Opt-in/Opt-out**: No configuration required - method is always available

## How to Use

### Collecting Stream Values into Array

```typescript
// For a streaming route that yields multiple items
const stream = await client.listPosts({ page: 1, limit: 10 })

// Option 1: Iterate manually
const posts = []
for await (const post of stream) {
  posts.push(post)
}

// Option 2: Use the new toArray() method
const posts = await stream.toArray()
```

### Practical Example

```typescript
// Streaming route that yields posts
export const listPosts = route.get('/posts', async function* () {
  yield { id: 1, title: 'First post' }
  yield { id: 2, title: 'Second post' }
  yield { id: 3, title: 'Third post' }
})

// Client usage
const stream = await client.listPosts()
const allPosts = await stream.toArray() // [{ id: 1, ... }, { id: 2, ... }, { id: 3, ... }]
```

## Configuration and Defaults

- **No configuration required**: Method is automatically attached to all `ResponseStream` instances
- **Return type**: `Promise<T[]>` where `T` is the stream item type

## API/CLI Specifics

**Interface Update**:

```typescript
export interface ResponseStream<T> extends AsyncIterableIterator<T> {
  toArray(): Promise<T[]>
  // ... existing methods like previousPage, nextPage
}
```

**Implementation**:

- Internally iterates through the entire stream
- Collects all yielded values into an array
- Returns a promise that resolves to the complete array

## Migration/Upgrade Notes

- **No breaking changes**: Existing streaming code continues to work
- **Additive enhancement**: New method provides convenience without changing existing behavior
- **Type safety**: Method is properly typed and provides IntelliSense support

## Performance/Limits

- **Memory usage**: Collects all stream items in memory - consider memory implications for large streams
- **Async behavior**: Method waits for the entire stream to complete before returning
- **Use case**: Best suited for streams with known, reasonable size limits

## References

**Files Modified**:

- `packages/client/src/formats/json-seq.ts` - Implementation of `toArray` method
- `packages/client/src/types.ts` - Interface definition for `ResponseStream`

**Implementation Details**:

- Method is attached to both live streams and cached result streams
- Uses `for await...of` loop internally to consume the stream
- Maintains compatibility with existing pagination methods

**Related**: This enhancement complements the existing streaming functionality and pagination features.

## Open Questions

### Critical

- What is the exact signature of toArray(): `Promise<T[]>` or `Promise<Array<T>>`?
- Does toArray() throw errors or integrate with errorMode to return `T[] | Error`?
- Can I call toArray() multiple times on the same ResponseStream instance?
- How do I handle memory issues when the stream contains millions of items?

### High

- Does toArray() preserve TypeScript generics from the original route return type?
- What happens if the stream encounters an error midway: partial array or complete failure?
- How do I cancel a toArray() operation that's taking too long?
- Does toArray() work with paginated responses or only single-page streams?

### Medium

- Can I transform items while collecting with toArray(), or do I need separate map operations?
- What's the performance difference between toArray() and manual `for await` collection?
- How do I debug slow toArray() operations to identify bottlenecks?
- Does toArray() respect request timeouts set in ClientOptions or RequestOptions?
