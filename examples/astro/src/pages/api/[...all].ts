/**
 * This module contains a hand-written Astro adapter for Hattip. It
 * forwards all requests to your Alien-RPC server handler.
 */

import { compileRoutes } from '@alien-rpc/service'
import type { AdapterRequestContext } from '@hattip/core'
import { chain } from 'alien-middleware'
import type { APIRoute } from 'astro'
import { getSecret } from 'astro:env/server'
import routes from '../../api-server'

// 1. Create the API handler for server-side requests.
const handler = chain(
  compileRoutes(routes, {
    prefix: '/api/',
  })
)

// 2. Define the Astro platform type.
export type AstroPlatform = {
  name: 'astro'
  locals: App.Locals
  preferredLocale: string | undefined
  preferredLocaleList: string[] | undefined
}

// 3. Define the API route.
export const ALL: APIRoute = async ({
  request,
  clientAddress,
  locals,
  preferredLocale,
  preferredLocaleList,
}) => {
  const hattipContext: AdapterRequestContext = {
    request,
    env: getSecret,
    ip: clientAddress,
    platform: {
      name: 'astro',
      locals,
      preferredLocale,
      preferredLocaleList,
    } satisfies AstroPlatform,
    // https://github.com/withastro/astro/blob/04e60119afee668264a2ff6665c19a32150f4c91/packages/integrations/cloudflare/src/utils/handler.ts#L84
    waitUntil:
      'runtime' in locals ? (locals.runtime as any).waitUntil : () => {},
    passThrough() {},
  }
  return handler(hattipContext)
}
