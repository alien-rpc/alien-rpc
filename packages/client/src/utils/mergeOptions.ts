import { ClientOptions } from '../types.js'
import { mergeHeaders } from './mergeHeaders.js'

export function mergeOptions(
  parentOptions: ClientOptions<any> | undefined,
  options: ClientOptions<any>
) {
  return {
    ...parentOptions,
    ...options,
    headers: mergeHeaders(parentOptions?.headers, options.headers),
    errorMode: options.errorMode ?? parentOptions?.errorMode ?? 'reject',
    resultCache: options.resultCache ?? parentOptions?.resultCache ?? new Map(),
  }
}
