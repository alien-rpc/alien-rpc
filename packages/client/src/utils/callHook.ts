import { castArray, isArray } from 'radashi'
import { RequestHookByName, RequestHooks } from '../types.js'

export function* iterateHooks<K extends keyof RequestHooks>(
  hooksOption: RequestHooks | readonly RequestHooks[] | undefined,
  name: K
): Generator<RequestHookByName[K]> {
  if (!hooksOption) {
    return
  }
  if (isArray(hooksOption)) {
    for (const hooks of hooksOption) {
      if (hooks[name]) {
        yield* castArray(hooks[name]) as RequestHookByName[K][]
      }
    }
  } else if (hooksOption[name]) {
    yield* castArray(hooksOption[name]) as RequestHookByName[K][]
  }
}
