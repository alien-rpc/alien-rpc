import { RequestContext } from 'alien-middleware'
import { isString } from 'radashi'
import { Promisable } from './internal/types.js'

export interface CorsConfig {
  /**
   * Trusted origins are allowed to send credentials.
   *
   * If neither this option nor `allowedOrigin` is set, all origins are
   * allowed.
   */
  trustedOrigin?: string | ((ctx: RequestContext) => Promisable<string | false>)

  /**
   * Untrusted origins can make requests, but are not allowed to send
   * credentials.
   *
   * If neither this option nor `trustedOrigin` is set, all origins are
   * allowed.
   */
  allowedOrigin?:
    | '*'
    | (string & {})
    | ((ctx: RequestContext) => Promisable<string | false>)
}

export function compilePreflightHandler(
  config: CorsConfig,
  resolveAllowedMethods: (ctx: RequestContext) => Set<string>
) {
  return async (ctx: RequestContext): Promise<Response | undefined> => {
    const { request } = ctx

    const headers = await allowOriginAndCredentials(ctx, config)

    if (!headers['Access-Control-Allow-Origin']) {
      return new Response(null, { status: 403 })
    }

    const allowedMethods = resolveAllowedMethods(ctx)

    if (allowedMethods.size) {
      const proposedMethod = request.headers.get(
        'Access-Control-Request-Method'
      )
      const proposedHeaders = request.headers.get(
        'Access-Control-Request-Headers'
      )

      return new Response(null, {
        headers: {
          ...headers,
          'Access-Control-Allow-Headers': proposedHeaders || '',
          'Access-Control-Allow-Methods':
            proposedMethod && allowedMethods.has(proposedMethod)
              ? proposedMethod
              : [...allowedMethods].join(', '),
        },
      })
    }
  }
}

/**
 * Generate the `Access-Control-Allow-Origin` and
 * `Access-Control-Allow-Credentials` headers based on the provided
 * configuration.
 */
export async function allowOriginAndCredentials(
  ctx: RequestContext,
  config: CorsConfig
) {
  const proposedOrigin = ctx.request.headers.get('Origin')

  let allowCredentials = false
  let allowedOrigin: string | null | false

  if (config.trustedOrigin !== undefined) {
    allowCredentials = true
    allowedOrigin = isString(config.trustedOrigin)
      ? config.trustedOrigin
      : await config.trustedOrigin(ctx)
  } else if (config.allowedOrigin !== undefined) {
    allowedOrigin = isString(config.allowedOrigin)
      ? config.allowedOrigin
      : await config.allowedOrigin(ctx)
  } else {
    allowedOrigin = proposedOrigin
  }

  return {
    'Access-Control-Allow-Credentials': String(allowCredentials),
    'Access-Control-Allow-Origin': allowedOrigin || '',
  }
}
