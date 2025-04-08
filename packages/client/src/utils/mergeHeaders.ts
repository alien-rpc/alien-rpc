import { shake } from 'radashi'
import { HeadersInit } from '../types.js'

function castHeaders(init: HeadersInit): Headers {
  return new Headers(
    Array.isArray(init) || init instanceof Headers ? init : shake(init)
  )
}

export function mergeHeaders(
  left: HeadersInit | undefined,
  right: HeadersInit | undefined
) {
  const overrides = right && castHeaders(right)
  const merged = left && castHeaders(left)
  if (merged && overrides) {
    overrides.forEach((value, key) => {
      merged.set(key, value)
    })
  }
  return merged || overrides || new Headers()
}
