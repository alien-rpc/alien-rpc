# @alien-rpc/route

Private workspace package for shared route constants and route metadata types.

## Status

This package is marked `private` and is not a downstream user entrypoint. It
exists so the client, service, and generator packages share the same HTTP method
and result-format vocabulary without duplicating constants.

## Surface

```ts
import { bodylessMethods } from '@alien-rpc/route'
import type { RouteMethod, RouteResultFormat } from '@alien-rpc/route'
```

The exact surface lives in `index.ts`. Published packages re-export the public
types they expect downstream users to import.
