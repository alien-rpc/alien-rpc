import { JSONCodable } from './internal/types.js'

/**
 * Using `JsonStream` makes it easy to push JSON-serializable values to the
 * client over a long-lived HTTP request or WebSocket connection. And yes,
 * you can return a `JsonStream` from your alien-rpc route!
 */
export class JsonStream<T extends JSONCodable | undefined>
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
    this.#writer.write(value)
  }

  close() {
    this.#writer.close()
  }

  abort(reason?: any) {
    this.#writer.abort(reason)
  }

  [Symbol.asyncIterator]() {
    return this.#readable[Symbol.asyncIterator]()
  }
}
