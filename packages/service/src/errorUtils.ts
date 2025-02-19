import type { ValueError } from '@sinclair/typebox/errors'
import {
  TransformDecodeCheckError,
  TransformDecodeError,
} from '@sinclair/typebox/value'

export type { ValueError }

export function isDecodeError(error: any): error is TransformDecodeError {
  return error instanceof TransformDecodeError
}

export function isDecodeCheckError(
  error: any
): error is TransformDecodeCheckError {
  return error instanceof TransformDecodeCheckError
}

export function firstLeafError(error: ValueError) {
  for (const suberror of flat(error.errors)) {
    if (suberror.errors) {
      return firstLeafError(suberror)
    }
    return suberror
  }
  return error
}

function* flat<T>(iterables: Iterable<T>[]) {
  for (const iterable of iterables) {
    yield* iterable
  }
}
