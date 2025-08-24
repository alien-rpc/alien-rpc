# Client Hooks Function Support

**Commit:** `add33fa` (2024-12-21)
**Feature:** `feat: let \`hooks\` be a function that receives the Client instance`

## Overview

This feature enhances the client's `hooks` option to support a function that receives the `Client` instance, enabling dynamic hook configuration based on the client's state and properties.

## Technical Changes

### Type Updates

The `ClientOptions.hooks` property now accepts:

```typescript
// Before: Only static hooks
hooks?: RequestHooks | readonly RequestHooks[] | undefined

// After: Static hooks OR a function that returns hooks
hooks?:
  | RequestHooks
  | readonly RequestHooks[]
  | ((client: Client) => RequestHooks | readonly RequestHooks[])
  | undefined
```

### Implementation Details

1. **Function-based hooks** are resolved when the client is created
2. The function receives the complete `Client` instance as its parameter
3. The function can return either a single `RequestHooks` object or an array of them
4. This allows for **per-instance customization** of hooks based on client configuration

## Usage Examples

### Basic Function-based Hooks

```typescript
import { defineClient } from '@alien-rpc/client'
import * as api from './generated/api.js'

const client = defineClient(api, {
  hooks: client => ({
    beforeError: error => {
      // Access client properties for dynamic behavior
      console.log(`Error on ${client.options.prefixUrl}:`, error.message)
      return error
    },
    afterResponse: ({ request, response }) => {
      // Use client instance for logging or metrics
      console.log(`${request.method} ${request.url} -> ${response.status}`)
    },
  }),
})
```

### Dynamic Hook Configuration

```typescript
const client = defineClient(api, {
  prefixUrl: 'https://api.example.com',
  hooks: client => {
    const hooks: RequestHooks = {
      afterResponse: ({ response }) => {
        // Different behavior based on client configuration
        if (client.options.prefixUrl?.includes('staging')) {
          console.log('Staging API response:', response.status)
        }
      },
    }

    // Conditionally add hooks based on client state
    if (client.options.errorMode === 'return') {
      hooks.beforeError = error => {
        // Special error handling for return mode
        error.message = `[Return Mode] ${error.message}`
        return error
      }
    }

    return hooks
  },
})
```

### Multiple Hook Arrays

```typescript
const client = defineClient(api, {
  hooks: client => [
    // Base logging hooks
    {
      afterResponse: ({ request }) => {
        console.log(`Request to: ${request.url}`)
      },
    },
    // Client-specific hooks
    {
      beforeError: error => {
        // Add client prefix to error messages
        const prefix = new URL(client.options.prefixUrl || '').hostname
        error.message = `[${prefix}] ${error.message}`
        return error
      },
    },
  ],
})
```

## Benefits

### 1. **Per-Instance Customization**

- Different hook behavior for different client instances
- Access to client configuration during hook setup

### 2. **Dynamic Hook Logic**

- Conditional hook registration based on client options
- Runtime adaptation to client state

### 3. **Enhanced Debugging**

- Include client-specific information in logs and errors
- Better traceability in multi-client applications

### 4. **Flexible Architecture**

- Supports both static and dynamic hook patterns
- Maintains backward compatibility with existing hook configurations

## Migration Guide

### Existing Static Hooks (No Changes Required)

```typescript
// This continues to work unchanged
const client = defineClient(api, {
  hooks: {
    afterResponse: ({ response }) => {
      console.log('Response received:', response.status)
    },
  },
})
```

### Converting to Function-based Hooks

```typescript
// Before: Static hooks
const staticHooks = {
  beforeError: error => {
    console.log('Error:', error.message)
    return error
  },
}

const client = defineClient(api, { hooks: staticHooks })

// After: Function-based hooks with client access
const client = defineClient(api, {
  hooks: client => ({
    beforeError: error => {
      // Now with access to client instance
      console.log(`Error on ${client.options.prefixUrl}:`, error.message)
      return error
    },
  }),
})
```

## Implementation Notes

- Function-based hooks are **resolved once** during client creation
- The client instance passed to the function is **fully initialized**
- Hook functions have access to all client properties and methods
- Supports the same hook merging behavior as static hooks when using `client.extend()`

## Related Types

```typescript
// Core hook types remain unchanged
export type BeforeErrorHook = (error: HTTPError) => Promisable<HTTPError>

export type AfterResponseHook = (args: {
  request: Request
  response: Response
}) => Promisable<Response | void>

export type RequestHooks = {
  beforeError?: BeforeErrorHook | readonly BeforeErrorHook[] | undefined
  afterResponse?: AfterResponseHook | readonly AfterResponseHook[] | undefined
}

// Updated ClientOptions type
export interface ClientOptions<TErrorMode extends ErrorMode = ErrorMode> {
  // ... other options
  hooks?:
    | RequestHooks
    | readonly RequestHooks[]
    | ((client: Client) => RequestHooks | readonly RequestHooks[])
    | undefined
}
```

## Open Questions

### Critical

- What is the exact type signature of the Client instance passed to the hooks function and what properties are guaranteed to be available?
- Can the hooks function return a Promise, and if not, how should async hook setup be handled?
- What happens to TypeScript inference when mixing static hooks with function-based hooks through client.extend()?

### High

- How does TypeScript handle the union type between static hooks and function-based hooks in ClientOptions?
- What are the type constraints for the hooks function parameter and return value?
- How does middleware type information flow through to the hooks function's client parameter?

### Medium

- Are there TypeScript utilities for testing function-based hooks with different client configurations?
- How should developers type custom properties added to hook contexts when using function-based hooks?
