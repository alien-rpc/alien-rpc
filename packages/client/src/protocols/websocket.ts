import { noop } from 'radashi'
import type { Client } from '../client.js'
import { NetworkError } from '../error.js'
import type { ClientOptions, HeadersInit, RouteProtocol, ws } from '../types.js'
import { joinURL } from '../utils/joinURL.js'
import { withRetry } from '../utils/retry.js'

function getWebSocketURL(options: ClientOptions) {
  return joinURL(options.prefixUrl ?? location.origin, 'ws')
}

export default {
  name: 'ws' as const,
  getURL(_, options) {
    return getWebSocketURL(options)
  },
  createFunction(route, client, method) {
    if (route.pattern === 'n') {
      return (...params: any[]) =>
        withRetry(client.options.retry, () => {
          return sendNotification(getConnection(client), method, params)
        })
    }
    return (...params: any[]) => {
      // The last parameter may contain an abort signal.
      let signal: AbortSignal | undefined

      if (params.length > 0) {
        const lastParam = params[params.length - 1]
        if (isRequestOptions(lastParam)) {
          signal = lastParam.signal
          params.pop()
        }
      }

      if (route.pattern === 'r') {
        return new Promise((resolve, reject) => {
          if (client.options.errorMode === 'return') {
            const wrappedResolve = resolve
            const wrappedReject = reject
            resolve = result => wrappedResolve([undefined, result])
            reject = error => wrappedReject([error, undefined])
          }

          const onMessage: OnMessageFactory = (id, parse, done) => message => {
            const response = parse(message)
            if (response.id !== id) {
              return
            }
            if ('error' in response) {
              reject(makeRequestError(response))
            } else {
              resolve(response.result)
            }
            done()
          }

          withRetry(client.options.retry, () => {
            return sendRequest(client, method, params, onMessage, signal)
          }).catch(reject)
        })
      }

      const stream = new TransformStream()
      const writer = stream.writable.getWriter()

      const onMessage: OnMessageFactory = (id, parse, done) => message => {
        const response = parse(message)
        if (response.id !== id) {
          return
        }
        if ('close' in response) {
          writer.close()
          done()
        } else if ('error' in response) {
          writer.abort(makeRequestError(response))
        } else {
          writer.write(response.result)
        }
      }

      withRetry(client.options.retry, () => {
        return sendRequest(
          client,
          method,
          params,
          onMessage,
          signal,
          stream.readable
        )
      }).catch(error => {
        writer.abort(error)
      })

      return stream.readable
    }
  },
} satisfies RouteProtocol<ws.Route>

function isRequestOptions(obj: any): obj is ws.RequestOptions {
  if (obj && Object.getPrototypeOf(obj) === Object.prototype) {
    const keys = Object.keys(obj)
    return (
      keys.length === 1 &&
      keys[0] === 'signal' &&
      (obj.signal === undefined || obj.signal instanceof AbortSignal)
    )
  }
  return false
}

type ConnectionState = {
  options: ClientOptions
  nextId: number
  activeRequests: number
  parsedMessages: WeakMap<MessageEvent, Response>
  pingTimeout: any
  pong: () => void
  idleTimeout: any
  onceConnected: (callback: (error?: Error) => void) => void
}

const connectionStates = new WeakMap<WebSocket, ConnectionState>()

function getConnection(client: Client) {
  const { ws } = client
  return !ws || ws.readyState > WebSocket.OPEN ? connect(client) : ws
}

declare const WebSocket: {
  new (
    url: string,
    options?: {
      /** Not available in browsers. */
      headers?: HeadersInit | undefined
    }
  ): globalThis.WebSocket

  CONNECTING: 0
  OPEN: 1
  CLOSING: 2
  CLOSED: 3
}

function connect(client: Client) {
  const ws = new WebSocket(
    getWebSocketURL(client.options),
    typeof document === 'undefined'
      ? { headers: client.options.headers }
      : undefined
  )
  const callbacks: ((error?: Error) => void)[] = []
  const onError = () => {
    // HACK: Force the client to reconnect, because the readyState might
    // still be `CONNECTING` even though the `error` event has fired.
    client.ws = undefined

    const error = new NetworkError('WebSocket failed to connect')
    callbacks.forEach(callback => callback(error))
    callbacks.length = 0
  }
  ws.addEventListener('error', onError)
  ws.addEventListener('open', () => {
    ws.removeEventListener('error', onError)
    callbacks.forEach(callback => callback())
    callbacks.length = 0
  })
  connectionStates.set(ws, {
    options: client.options,
    nextId: 1,
    activeRequests: 0,
    parsedMessages: new WeakMap(),
    pingTimeout: null,
    pong: noop,
    idleTimeout: null,
    onceConnected(callback) {
      if (ws.readyState === WebSocket.OPEN) {
        callback()
      } else {
        callbacks.push(callback)
      }
    },
  })
  return (client.ws = ws)
}

function onceConnected(ws: WebSocket, callback: (error?: Error) => void) {
  if (ws.readyState === WebSocket.OPEN) {
    callback()
  } else {
    connectionStates.get(ws)!.onceConnected(callback)
  }
}

function sendMessage(
  ws: WebSocket,
  method: string,
  params: any[],
  id?: number
) {
  ws.send(JSON.stringify({ method, params, id }))
  setPingTimeout(ws)
}

function sendNotification(ws: WebSocket, method: string, params: any[]) {
  return new Promise<void>((resolve, reject) => {
    onceConnected(ws, error => {
      if (error) {
        reject(error)
      } else {
        sendMessage(ws, method, params)
        setIdleTimeout(ws)
        resolve()
      }
    })
  })
}

type OnMessageFactory = (
  id: number,
  parse: (message: MessageEvent) => Response,
  done: () => void
) => (message: MessageEvent) => void

function sendRequest(
  client: Client,
  method: string,
  params: any[],
  getListener: OnMessageFactory,
  signal?: AbortSignal,
  readable?: ReadableStream
) {
  signal?.throwIfAborted()
  return new Promise<void>((resolve, reject) => {
    const ws = getConnection(client)
    const state = connectionStates.get(ws)!

    // This flag is only used when the websocket is still connecting. Once
    // it's finally connected, this flag ensures no message is sent if the
    // request is cancelled.
    let cancelled = false
    let onAbort: () => void

    const onRequestEnded = () => {
      signal?.removeEventListener('abort', onAbort)

      // This logic is only needed if the websocket hasn't lost connection.
      if (ws.readyState === WebSocket.OPEN) {
        ws.removeEventListener('message', onMessage)
        ws.removeEventListener('close', onClose)

        if (--state.activeRequests === 0) {
          setIdleTimeout(ws, state)
        }
      }
    }

    signal?.addEventListener(
      'abort',
      (onAbort = () => {
        if (!cancelled) {
          cancelled = true
          onRequestEnded()
          reject(signal.reason)

          // Attempt to notify the server that the request was cancelled.
          if (ws.readyState === WebSocket.OPEN) {
            sendMessage(ws, '.cancel', [id])
          }
        }
      })
    )

    if (readable) {
      readable.cancel = async function (reason) {
        if (!cancelled) {
          cancelled = true
          onRequestEnded()
          resolve()

          // Attempt to notify the server that the request was cancelled.
          if (ws.readyState === WebSocket.OPEN) {
            sendMessage(ws, '.cancel', [id])
          }
        }

        // Restore the original cancel method.
        this.cancel = Object.getPrototypeOf(this).cancel

        if (!this.locked) {
          return this.cancel(reason)
        }
      }
    }

    const id = state.nextId++
    state.activeRequests++

    const onMessage = getListener(
      id,
      message => {
        let response = state.parsedMessages.get(message)
        if (!response) {
          response = JSON.parse(message.data) as Response
          state.parsedMessages.set(message, response)

          // When a new message is received, clear the pong timeout and set
          // a new ping timeout.
          state.pong()
          setPingTimeout(ws, state)
        }
        return response
      },
      () => {
        onRequestEnded()
        resolve()
      }
    )

    const onClose = (event: CloseEvent) => {
      onRequestEnded()
      if (event.wasClean) {
        resolve()
      } else {
        reject(new NetworkError('WebSocket lost connection'))
      }
    }

    ws.addEventListener('message', onMessage)
    ws.addEventListener('close', onClose)

    state.onceConnected(error => {
      if (cancelled) {
        return
      }
      if (error) {
        onRequestEnded()
        reject(error)
      } else {
        sendMessage(ws, method, params, id)
      }
    })
  })
}

function setPingTimeout(ws: WebSocket, state = connectionStates.get(ws)!) {
  const { wsPingInterval = 20, wsPongTimeout } = state.options
  if (wsPingInterval > 0) {
    clearTimeout(state.pingTimeout)
    state.pingTimeout = setTimeout(
      () => {
        const pongTimeout = setTimeout(
          () => {
            ws.close()
          },
          (wsPongTimeout ?? 20) * 1000
        )
        state.pong = () => {
          clearTimeout(pongTimeout)
          state.pong = noop
        }
        ws.send(JSON.stringify({ method: '.ping' }))
      },
      (wsPingInterval ?? 20) * 1000
    )
  }
}

function setIdleTimeout(ws: WebSocket, state = connectionStates.get(ws)!) {
  const { wsIdleTimeout = 0 } = state.options
  if (wsIdleTimeout > 0 && state.activeRequests === 0) {
    clearTimeout(state.idleTimeout)
    state.idleTimeout = setTimeout(() => {
      ws.close()
    }, wsIdleTimeout * 1000)
  }
}

type Response = { id: number; result: any } | ErrorResponse

type ErrorResponse = {
  id: number
  error: {
    message: string
    code: number
    data: any
  }
}

function makeRequestError(response: ErrorResponse): ws.RequestError {
  const error = Object.assign(new Error(), response.error)
  error.name = 'ws.RequestError'
  return error as any
}
