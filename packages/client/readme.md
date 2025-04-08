# @alien-rpc/client

This package wraps `fetch` with a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) that allows you to call your API routes as TypeScript methods.

> [!NOTE]
> Typically, you should install `alien-rpc` instead of this package directly, then import from this package via `alien-rpc/client`.

```ts
// client/index.ts
import { defineClient } from '@alien-rpc/client'
import * as API from './generated/api.js'

export default defineClient(API)
```

Where you import the generated `API` namespace depends on what you passed to the `alien-rpc` CLI (or the `@alien-rpc/generator` library). The default path is `./client/generated/api.ts` relative to your root directory. The `--clientOutFile` option can be used to change this.

### Options

The `defineClient` function accepts an options object, which includes any `fetch` options and also the following:

- `errorMode`: A string that determines how errors are handled by the client.
  - `'reject'`: Errors reject the query promise. _This is the default._
  - `'return'`: Errors are returned as a tuple with the error as the first element and the result as the second element. If an error is returned, the result will be `undefined`, and vice versa.
- `fetch`: A function to use instead of `globalThis.fetch`.
- `hooks`: Hook into the request lifecycle.
- `retry`: A number or object that determines how the client retries requests.
- `timeout`: A number that determines the request timeout.
- `prefixUrl`: A string or URL that is prepended to the request URL.
- `wsPingInterval`: A number that determines the WebSocket ping interval.
- `wsPongTimeout`: A number that determines the WebSocket pong timeout.
- `wsIdleTimeout`: A number that determines the WebSocket idle timeout.

In TypeScript, you can use the `ClientOptions` type whenever you have an object variable/parameter whose properties should match the options supported by `defineClient`.

### Methods

Every RPC route found by [@alien-rpc/generator](https://github.com/alloc/alien-rpc/tree/master/packages/generator) will be available as a method on the `Client` object.

Each client also has the following methods:

- `extend(options: ClientOptions)`: Create a client with the given options, using the current client as a source of default options.
- `fetch(input, init?)`: Send an non-typed request with the `fetch` API extended by the client's `options` object.

## Example

An end-to-end example does not currently exist.

For now, you can take a look at [the test snapshots](https://github.com/alloc/alien-rpc/tree/master/test/generator/__snapshots__) to get an idea of what the generated code looks like.
