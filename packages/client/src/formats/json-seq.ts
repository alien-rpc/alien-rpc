import type { Client } from '../client.js'
import { resolveStackTrace } from '../node/sourcemap.js'
import type {
  RequestOptions,
  ResponseFormat,
  ResponseParser,
  ResponseStream,
  RoutePagination,
} from '../types.js'

const parseResponse = ((promisedResponse, client) => {
  async function* parse() {
    const response = await promisedResponse
    if (!response.body) {
      return
    }
    const parser = new TransformStream(parseJSONSequence())
    for await (const value of response.body.pipeThrough(parser)) {
      if (value != null && isRoutePagination(value)) {
        attachPageMethods(responseStream, value, client)
      } else if (value != null && isRouteError(value)) {
        if (process.env.NODE_ENV !== 'production') {
          value.$error.stack = await resolveStackTrace(value.$error.stack)
        }
        throw Object.assign(new Error(), value.$error)
      } else {
        yield value
      }
    }
  }

  const responseStream: ResponseStream<any> = parse() as any
  responseStream.toArray = toArray
  return responseStream
}) satisfies ResponseParser

export default {
  name: 'json-seq',
  parse: parseResponse,
} satisfies ResponseFormat

async function toArray(this: AsyncIterableIterator<any>) {
  const result = []
  for await (const value of this) {
    result.push(value)
  }
  return result
}

function requestPage(client: Client, path: string, options?: RequestOptions) {
  return parseResponse(client.fetch(path, options), client)
}

function attachPageMethods(
  responseStream: ResponseStream<any>,
  object: RoutePagination,
  client: Client
) {
  if (object.$prev) {
    responseStream.previousPage = options =>
      requestPage(client, object.$prev!, options)
  }
  if (object.$next) {
    responseStream.nextPage = options =>
      requestPage(client, object.$next!, options)
  }
}

function isRoutePagination(arg: {}): arg is RoutePagination {
  // The server ensures both `prev` and `next` are defined, even though the
  // RpcPagination type says otherwise.
  return (
    Object.prototype.hasOwnProperty.call(arg, '$prev') &&
    Object.prototype.hasOwnProperty.call(arg, '$next') &&
    hasExactKeyCount(arg, 2)
  )
}

function isRouteError(arg: {}): arg is { $error: any } {
  return (
    Object.prototype.hasOwnProperty.call(arg, '$error') &&
    hasExactKeyCount(arg, 1)
  )
}

function hasExactKeyCount(object: {}, count: number) {
  let i = 0
  for (const _ in object) {
    if (++i > count) {
      break
    }
  }
  return i === count
}

function parseJSONSequence(): Transformer<Uint8Array, object> {
  const decoder = new TextDecoder()
  const separator = 0x1e // ASCII code for Record Separator
  const lineFeed = 0x0a // ASCII code for Line Feed

  let buffer = new Uint8Array(0)

  const parse = (controller: TransformStreamDefaultController) => {
    // Verify that the first byte is a record separator.
    if (buffer.at(0) !== separator) {
      throw new Error('Invalid JSON sequence')
    }

    let nextIndex = 0
    let endIndex: number

    while (nextIndex < buffer.length) {
      endIndex = buffer.indexOf(separator, nextIndex + 1)
      if (endIndex === -1) {
        endIndex = buffer.length
      }
      if (buffer.at(endIndex - 1) !== lineFeed) {
        break
      }
      // Decode the text between the record separator and the line feed.
      const text = decoder.decode(buffer.subarray(nextIndex + 1, endIndex - 1))
      controller.enqueue(JSON.parse(text))
      nextIndex = endIndex
    }

    return nextIndex
  }

  return {
    transform(chunk: Uint8Array, controller) {
      buffer = concatUint8Arrays(buffer, chunk)
      const nextIndex = parse(controller)
      if (nextIndex > 0) {
        buffer = buffer.subarray(nextIndex)
      }
    },
    flush(controller) {
      if (buffer.length) {
        parse(controller)
      }
    },
  }
}

function concatUint8Arrays(
  a: Uint8Array,
  b: Uint8Array
): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(a.length + b.length)
  result.set(a, 0)
  result.set(b, a.length)
  return result
}
