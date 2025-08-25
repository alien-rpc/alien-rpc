# Export ResponseStreamDirective Type

**Commit:** 38820bdd89436531ca7700cb8c3d96e02cfa2e28  
**Author:** Alec Larson <1925840+aleclarson@users.noreply.github.com>  
**Date:** Sat Mar 1 15:15:34 2025 -0500  
**Short SHA:** 38820bd

## Summary

Exported the `ResponseStreamDirective` type from the client package to provide type safety for JSON sequence stream control messages.

## User Impact

**Audience:** TypeScript developers using alien-rpc client with streaming responses

**Default Behavior:** The type is now available for import and use in type annotations

**Opt-in/Opt-out:** Opt-in by importing the type when needed

## How to Use

```typescript
import { ResponseStreamDirective } from '@alien-rpc/client'

// Use in type annotations for stream processing
function processStreamDirective(directive: ResponseStreamDirective) {
  if ('$error' in directive) {
    // Handle error directive
    console.error('Stream error:', directive.$error)
  } else {
    // Handle pagination directive
    console.log('Pagination info:', directive)
  }
}
```

## Configuration and Defaults

**Type Definition:**
```typescript
export type ResponseStreamDirective = RoutePagination | { $error: object }
```

**Components:**
- `RoutePagination`: Contains pagination metadata (`$prev`, `$next`) for paginated streams
- `{ $error: object }`: Error objects sent through JSON sequence streams

## API/CLI Specifics

**Import Path:** `@alien-rpc/client`

**Usage Context:** 
- JSON sequence response streams
- Custom stream processing logic
- Type-safe handling of stream control messages

## Migration/Upgrade Notes

- No breaking changes
- Existing code continues to work without modification
- Type is available for enhanced type safety in new code

## Security/Permissions

No security implications - this is a type-only export.

## Performance/Limits

No performance impact - compile-time type information only.

## References

**Files Modified:**
- `packages/client/src/types.ts`: Added type export

**Related Features:**
- JSON sequence streaming
- Response stream pagination
- Stream error handling

**Tests:** No test changes required for type-only export

## Open Questions

No unanswered questions