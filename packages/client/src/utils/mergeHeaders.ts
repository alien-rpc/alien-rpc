import { shake } from 'radashi'

type KyHeadersInit = NonNullable<import('ky').Options['headers']>

function castHeaders(
  init: KyHeadersInit | undefined,
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
  left: KyHeadersInit | undefined,
  right: KyHeadersInit | undefined
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
