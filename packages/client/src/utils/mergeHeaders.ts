import { shake } from 'radashi'
import { HeadersInit } from '../types.js'

function castHeaders(
  init: HeadersInit | undefined,
  shouldClone?: boolean
): Headers | undefined {
  if (!init) {
    return undefined
  }
  if (init instanceof Headers) {
    return shouldClone ? new Headers(init) : init
  }
  if (Array.isArray(init)) {
    return init.length ? new Headers(init) : undefined
  }
  return new Headers(shake(init))
}

export function mergeHeaders(
  left: HeadersInit | undefined,
  right: HeadersInit | undefined
) {
  const overrides = castHeaders(right)
  const merged = castHeaders(left, !!overrides)
  if (merged && overrides) {
    overrides.forEach((value, key) => {
      merged.set(key, value)
    })
  }
  return merged || overrides
}
