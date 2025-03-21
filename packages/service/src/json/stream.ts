import { JSONCodable } from './types.js'

/**
 * Using `JsonStream` makes it easy to push JSON-serializable values to the
 * client over a long-lived HTTP request or WebSocket connection. And yes,
 * you can return a `JsonStream` from your alien-rpc route!
 */
export class JSONStream<T extends JSONCodable | undefined>
  implements AsyncIterable<T>
{
  #readable: ReadableStream<T>
  #writer: WritableStreamDefaultWriter<T>

  constructor() {
    const { readable, writable } = new TransformStream()
    this.#readable = readable
    this.#writer = writable.getWriter()
  }

  write(value: T) {
    return this.#writer.write(value)
  }

  close() {
    return this.#writer.close()
  }

  abort(reason?: any) {
    return this.#writer.abort(reason)
  }

  [Symbol.asyncIterator]() {
    return this.#readable[Symbol.asyncIterator]()
  }
}
