import { ClientOptions } from '../types.js'
import { mergeHeaders } from './mergeHeaders.js'
import { mergeHooks } from './mergeHooks.js'
import { mergeRetryOptions } from './retry.js'

export function mergeOptions(
  parentOptions: ClientOptions<any> | undefined,
  options: ClientOptions<any>
) {
  return {
    ...parentOptions,
    ...options,
    hooks: mergeHooks(parentOptions?.hooks, options.hooks),
    retry: mergeRetryOptions(parentOptions?.retry, options.retry),
    headers: mergeHeaders(parentOptions?.headers, options.headers),
    errorMode: options.errorMode ?? parentOptions?.errorMode ?? 'reject',
  }
}
