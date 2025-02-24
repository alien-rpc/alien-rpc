import { isArray } from 'radashi'
import { RequestHooks } from '../types.js'

export function mergeHooks(
  parentHooks: RequestHooks | readonly RequestHooks[] | undefined,
  hooks: RequestHooks | readonly RequestHooks[] | undefined
) {
  if (hooks && parentHooks) {
    if (isArray(parentHooks)) {
      return parentHooks.concat(hooks)
    }
    if (isArray(hooks)) {
      return [parentHooks, ...hooks]
    }
    return [parentHooks, hooks]
  }
  return hooks ?? parentHooks
}
