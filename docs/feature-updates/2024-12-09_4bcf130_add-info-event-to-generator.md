# Add "info" Event to Generator

**Commit:** `4bcf130` (2024-12-09)

## Summary

Adds a new "info" event type to the generator that allows emitting informational messages during the code generation process. This enhances debugging capabilities and provides better visibility into generator operations.

## User-visible Changes

- Added "info" event type to generator event system
- CLI automatically logs info events to console
- Supports both string messages and formatted console arguments
- No configuration required - works automatically with existing CLI

## Examples

### CLI Usage

```bash
# Running the generator shows info events automatically
npx alien-rpc generate

# Example output:
# ✓ Found route: GET /api/users
# ℹ Processing type definitions...
# ✓ Found route: POST /api/users
```

### Programmatic Usage

```typescript
import generator from '@alien-rpc/generator'

const gen = generator({
  // your options
})

// Listen for info events
gen.on('info', event => {
  if (Array.isArray(event.message)) {
    console.log(...event.message)
  } else {
    console.log(event.message)
  }
})

gen.on('route', event => {
  // Handle route events as usual
})
```

### Event Type Definition

```typescript
type Event =
  | { type: 'route'; route: AnalyzedRoute }
  | { type: 'info'; message: string | [string, ...any[]] }
```

### Message Formats

```typescript
// Simple string message
{ type: 'info', message: 'Processing complete' }

// Formatted arguments (like console.log)
{ type: 'info', message: ['Found %d routes', routeCount] }
```

### CLI Event Handling

```typescript
// CLI automatically handles info events
if (event.type === 'info') {
  if (isArray(event.message)) {
    log(...event.message)
  } else {
    log(event.message)
  }
}
```

## Config/Flags

No configuration required. Info events are automatically handled by the CLI and can be listened to programmatically.

## Breaking/Migration

No breaking changes. Existing event handling continues to work unchanged. This is a purely additive enhancement.

## Tags

- generator
- events
- logging
- debugging
- cli
- developer-experience
- non-breaking

## Evidence

- Updated `packages/generator/src/generator.ts` (added info event type definition)
- Updated `packages/alien-rpc/src/main.ts` (added CLI handling for info events)
