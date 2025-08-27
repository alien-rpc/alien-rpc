# Service Use Message Property When Logging Thrown JSON Response

**Commit:** b71f9ff3112c4569a76d0f7296debed8b745b9dc
**Author:** Alec Larson
**Date:** Sun Feb 23 16:15:18 2025 -0500
**Short SHA:** b71f9ff

## Summary

Refactored error logging to use `message` property from JsonResponse bodies for more meaningful development error messages.

## User-Visible Changes

- **Enhanced error logging**: Custom messages from JsonResponse bodies now appear in development logs instead of generic "Thrown response"
- **Better debugging experience**: Error logs show contextual messages like "User authentication failed" or "Invalid request parameters"
- **Preserved functionality**: All existing error handling behavior remains unchanged
- **Development-only improvement**: Changes only affect development environment logging
- **Automatic message extraction**: JsonResponse bodies with `message` property automatically used for log output
- **Fallback behavior**: Non-JsonResponse objects or those without `message` property still show "Thrown response"
- **Stack trace preservation**: Original Response stack traces maintained in error logs
- **Property copying**: All Response properties still copied to Error object for debugging

## Examples

### Error Logging Enhancement

**Before:**
```ts
// All errors showed generic message
throw new JsonResponse({ message: 'User not found', code: 'USER_404' })
// Log: "Error: Thrown response"
```

**After:**
```ts
// Custom messages now appear in logs
throw new JsonResponse({ message: 'User not found', code: 'USER_404' })
// Log: "Error: User not found"
```

### Function Refactoring

```ts
// Old utility (removed)
export function createError(message: string, props: any)

// New utility (specialized for Response objects)
export function getErrorFromResponse(response: Response): Error
```

## Config/Flags

- No configuration changes
- Development environment logging only
- Automatic message extraction from JsonResponse bodies

## Breaking/Migration

- **Breaking**: Internal `createError` function removed (unlikely to affect users)
- **Migration**: Replace `createError` calls with `getErrorFromResponse` if used directly
- **Non-breaking**: All existing error handling behavior preserved

## Tags

`logging` `error-handling` `development` `json-response` `debugging`

## Evidence

**Modified Files:**
- `packages/service/src/errorUtils.ts` - Replaced `createError` with `getErrorFromResponse`
- `packages/service/src/responders/json-seq.ts` - Updated error logging to use new function

**Message Extraction Logic:**
- JsonResponse with `message` property: Uses custom message in logs
- JsonResponse without `message`: Falls back to "Thrown response"
- Other Response types: Uses "Thrown response" default
- Stack trace preservation: Original Response stack traces maintained

**Development Benefits:**
- Contextual error messages like "User authentication failed" instead of generic "Thrown response"
- Better debugging experience with meaningful log output
- Automatic property copying from Response to Error object