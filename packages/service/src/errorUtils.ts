import type { ValueError } from '@sinclair/typebox/errors'
import {
  TransformDecodeCheckError,
  TransformDecodeError,
} from '@sinclair/typebox/value'
import { JSONResponse } from './response.js'

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

export function getStackTrace(error: Error) {
  return error.stack?.replace(/^.*(?<! *at\b.*)\n/gm, '')
}

export function getErrorFromResponse(response: Response) {
  const { message = 'Thrown response', ...props } =
    response instanceof JSONResponse ? response.decodedBody : {}
  const error = new Error(message)
  Object.assign(error, props)
  if (process.env.NODE_ENV !== 'production' && 'stack' in response) {
    error.stack = 'Error: ' + message + '\n' + response.stack
  }
  return error
}
