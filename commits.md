commit d9a6c47a8f7c42eeedd6dbf5e6fdbe73f016e20c
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Sun Feb 23 18:21:24 2025 -0500

    feat(service): simplify json-seq error handling a little bit

commit c7d29abcd647d990ba3e6c08ac0832dea30c7e9d
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Mon Feb 24 11:40:32 2025 -0500

    feat(client): add `hooks` option (inspired by ky)

    Only the beforeError and afterResponse hooks are currently implemented.

commit 38820bdd89436531ca7700cb8c3d96e02cfa2e28
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Sat Mar 1 15:15:34 2025 -0500

    feat(client): export `ResponseStreamDirective` type

commit 4f3d4c23e6ee97c13ef4a89cad7ceaaf9d169e9d
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Sat Mar 1 18:19:54 2025 -0500

    feat!: add `buildRouteURL` and `getRouteFromFunction` functions

    This is a breaking change, since the `Client#paths` property no longer exists and some public types were removed/replaced.

    This commit attaches type information to route functions, which buildRouteURL uses for type safety (of course).

    The `Route` type had its type parameter changed to separate path parameters, search parameters, and the request body into their own disparate types, which helps with type inference.

    This commit also adds the following “helper types”:
    - `Route.withNoParams` is a Route with no path parameters or search parameters
    - `Route.withOptionalParams` is a Route with only optional path/search parameters
    - `Route.inferParams<T>` gets the parameters type used by buildRouteURL
    - `Route.inferResult<T>` is a quick way to get the result of a route handler

commit 635332b4d07e7cf1adc9a2795d724940b6cdfafc
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Tue Mar 18 16:35:43 2025 -0400

    feat(client): add `timeout` request option

commit f3842b15e42ede8996d7fa169ba1204fbd800385
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Tue Apr 8 18:11:23 2025 -0400

    feat(client): ensure `client.options.headers` is a Headers object

    This allows a client instance to have headers added or removed (e.g. upon authentication) without having to reinitialize it or postpone its creation.

commit e5b51b71b6e1acd004c1a9b7bfa802499626c36e
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Fri Apr 18 17:18:24 2025 -0400

    feat: support regular enums

commit 5cc515bb68401212c73f70367dc2b9f80fbbd8bf
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Sat Apr 19 12:48:09 2025 -0400

    feat(generator)!: export client routes using scope objects

    The default scope is an `export default { … }` declaration.

    Namespaces are declared with `export const <name> = { … }`

    This avoids issues with enum types (when calling defineClient).

    So now, you import the client routes like so:

        import { defineClient } from 'alien-rpc/client'
        import api from './generated/api.ts'

        const client = defineClient(api)

    Notably, namespaced routes need to be merged in if you want an all-encompassing client instance.

        import api, { admin } from './generated/api.ts'

        const client = defineClient({ ...api, admin })

commit fce689065c8ea4c6846582d42e08187d9efe0d9f
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Sun May 4 19:04:15 2025 -0400

    feat!: migrate to alien-middleware

    This drops our dependency on @hattip/compose in favor of a safer API.

commit 3ac11dbcc9fd0caeb77f1b0606f609569526db47
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Tue May 13 15:17:58 2025 -0400

    feat!: replace hattip-ws with alien-ws

commit a1a6dfa2238027a377e80cf8ada8d89b1d1c6e53
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Wed May 28 18:27:12 2025 -0400

    feat(client): load sourcemaps to resolve stack traces in Node.js environments

commit 94949a71f60ed65c35ecda16aa4d1bf782162d58
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Mon Jul 14 14:14:18 2025 -0400

    feat(client): support routes with a Uint8Array request body

    When calling such a route, you must set the `body` param to a Uint8Array instance.

commit 0de7d673dc297a05f0325cfdf9f2258b19415ef3
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Tue Jul 15 02:51:37 2025 -0400

    feat!: replace support for Uint8Array body with Blob

commit a4000cad0f7399c31de8b3fb208d0ffef1508d03
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Tue Jul 15 15:15:41 2025 -0400

    feat: support FormData as body type

commit 230e42a7bfa328b8ac0b8e4981668390f51c514e
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Tue Jul 15 20:25:21 2025 -0400

    feat: support ArrayBuffer as body type

commit de41775d777d8cce795aa3c25d5b05a2440680b0
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Tue Jul 15 21:44:25 2025 -0400

    feat!: merge ArrayBuffer support into Blob support

    This means that @alien-rpc/service routes should always use Blob as their body type, but the @alien-rpc/client instance can pass any of Blob, ArrayBuffer, or Uint8Array. Notably, if the client doesn’t use Blob, they should also define the Content-Type header.

commit c96e973fb2d727004dcfde640ae40bd1cee08f7b
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Sat Jul 19 01:21:29 2025 -0400

    feat(client): allow relative prefixUrl

commit e71ff6385bf6ae2c8fe5aea34eafa6cc0e41286b
Author: Alec Larson <1925840+aleclarson@users.noreply.github.com>
Date: Sun Jul 20 17:10:58 2025 -0400

    feat(generator): include exported types in generated output

    This is a workaround for two edge cases:

    1. If you have a non-generic type alias that is a union type, the type checker will flatten it. This means the type alias won’t exist in the type checker’s mind. This made it impossible to detect usage of the type alias by alien-rpc routes, which led to reference errors at runtime if the type alias was used anywhere in a route’s input parameters.

    2. Any type that is used *only* in a route’s output type may not get discovered via static analysis.

    In either case, you can now export the missing type from any file analyzed by the alien-rpc generator.
