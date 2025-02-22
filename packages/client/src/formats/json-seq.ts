import type { Client } from '../client.js'
import type {
  RequestOptions,
  ResponseStream,
  RoutePagination,
} from '../types.js'

export default function parseResponse(
  promisedResponse: Promise<Response>,
  client: Client
) {
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
        throw Object.assign(new Error(), value.$error)
      } else {
        yield value
      }
    }
  }

  const responseStream: ResponseStream<any> = parse() as any
  responseStream.toArray = toArray
  return responseStream
}

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
    let startIndex = 0
    let endIndex: number

    // Verify that the first byte is a record separator.
    if (buffer.at(0) !== separator) {
      startIndex = buffer.indexOf(separator)
      if (startIndex === -1) {
        return -1
      }
    }

    while (startIndex < buffer.length) {
      endIndex = buffer.indexOf(separator, startIndex + 1)
      if (endIndex === -1) {
        endIndex = buffer.length
      }
      if (buffer.at(endIndex - 1) === lineFeed) {
        // Decode the text between the record separator and the line feed.
        const text = decoder.decode(
          buffer.subarray(startIndex + 1, endIndex - 1)
        )
        controller.enqueue(JSON.parse(text))
        startIndex = endIndex
      }
    }

    return startIndex
  }

  return {
    transform(chunk: Uint8Array, controller) {
      buffer = concatUint8Arrays(buffer, chunk)
      const endIndex = parse(controller)
      if (endIndex > 0) {
        buffer = buffer.subarray(endIndex)
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
