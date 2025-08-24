# Add "info" Event to Generator

## Commit Metadata

- **Full SHA**: 4bcf1307bbceab5a359d98392a74fbe0ca9305a8
- **Author**: Alec Larson <1925840+aleclarson@users.noreply.github.com>
- **Date**: Mon Dec 9 10:47:00 2024 -0500
- **Short SHA**: 4bcf130

## Summary

Adds a new "info" event type to the generator that allows emitting informational messages during the code generation process.

## User Impact

**Audience**: Developers using alien-rpc CLI and those integrating with the generator programmatically

**Default Behavior**: Info events are automatically logged to the console when using the CLI

**Opt-in/Opt-out**: Automatic - info events are handled by the CLI without user configuration

## How to Use

### CLI Usage

When running the alien-rpc CLI, info events will automatically appear in the console output:

```bash
# Running the generator
npx alien-rpc generate

# Info events will be logged alongside route discovery messages
# Example output:
# ✓ Found route: GET /api/users
# ℹ Processing type definitions...
# ✓ Found route: POST /api/users
```

### Programmatic Usage

When using the generator programmatically, you can listen for info events:

```typescript
import generator from '@alien-rpc/generator'

const gen = generator({
  // your options
})

gen.on('info', event => {
  if (Array.isArray(event.message)) {
    console.log(...event.message)
  } else {
    console.log(event.message)
  }
})

gen.on('route', event => {
  // Handle route events
})
```

## Configuration and Defaults

- **No configuration required**: Info events are automatically handled by the CLI
- **Event structure**: Info events contain either a string message or an array of arguments for logging
- **Automatic logging**: The CLI automatically logs info events to the console

## API/CLI Specifics

**Event Type Definition**:

```typescript
type Event =
  | { type: 'route'; route: AnalyzedRoute }
  | { type: 'info'; message: string | [string, ...any[]] }
```

**CLI Handling**:

```typescript
// In the CLI, info events are handled like this:
if (event.type === 'info') {
  if (isArray(event.message)) {
    log(...event.message)
  } else {
    log(event.message)
  }
}
```

**Message Formats**:

- **Simple string**: `{ type: 'info', message: 'Processing complete' }`
- **Formatted arguments**: `{ type: 'info', message: ['Found %d routes', routeCount] }`

## Migration/Upgrade Notes

- **No breaking changes**: Existing event handling continues to work
- **Additive enhancement**: New event type doesn't affect existing route events
- **Backward compatible**: Existing generator integrations will continue to work

## Performance/Limits

- **Minimal overhead**: Info events are lightweight and don't impact generation performance
- **Optional handling**: If no listeners are attached, info events are simply ignored
- **Flexible messaging**: Supports both simple strings and formatted console arguments

## Security/Permissions

No security implications - this is a logging and debugging feature.

## References

**Files Modified**:

- `packages/generator/src/generator.ts` - Added info event type definition
- `packages/alien-rpc/src/main.ts` - Added CLI handling for info events

**Event System**:

- Uses the existing jumpgen event system
- Integrates with the CLI's logging infrastructure
- Supports both string and formatted argument messages

**Use Cases**:

- Debugging generator behavior
- Providing progress updates during generation
- Logging internal processing steps
- Enhanced developer experience with better visibility

**Related**: This enhancement complements the existing route event system and improves the developer experience when working with the generator.

## Open Questions

### Critical

- How do I listen for info events: `generator.on('info', callback)` or different API?
- What is the exact TypeScript interface for info event payloads?
- Can info events be disabled for production builds to avoid performance overhead?
- Do info events work with both programmatic generator usage and CLI usage?

### High

- What specific information is included in info events: progress, file paths, timing data?
- How do I integrate info events with my existing logging framework (Winston, Pino, etc.)?
- Can I filter info events by severity level or event type?
- Do info events provide enough detail to build a progress bar or status indicator?

### Medium

- How do I handle info event errors without breaking the generation process?
- Can I use info events to implement custom caching strategies based on file changes?
- What's the performance impact of attaching multiple info event listeners?
- How do info events behave in watch mode vs single-run generation?
