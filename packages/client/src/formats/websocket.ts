import { Client } from '../client'
import { NetworkError } from '../error'
import { ClientOptions, ws } from '../types'
import { joinURL } from '../utils/joinURL'
import { withRetry } from '../utils/retry'

export function isWebSocketRouteDefinition(
  obj: any
): obj is ws.RouteDefinition {
  return !!obj && obj.protocol === 'ws'
}

export function getWebSocketURL(options: ClientOptions) {
  return joinURL(options.prefixUrl ?? location.origin, '/ws')
}

export function createWebSocketFunction(
  method: string,
  route: ws.RouteDefinition,
  client: Client
) {
  if (route.pattern === 'n') {
    return (...params: any[]) =>
      withRetry(client.options.retry, () =>
        connect(client, ws => sendMessage(ws, createMessage(method, params)))
      )
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

        const onMessage: OnMessageFactory = (id, done) => message => {
          const response = ((message as any).json ??= JSON.parse(
            message.data
          )) as Response
          if (response.id !== id) return
          if ('error' in response) {
            reject(makeRequestError(response))
          } else {
            resolve(response.result)
          }
          done()
        }

        withRetry(client.options.retry, () => {
          return connect(client, ws => {
            return sendRequest(ws, method, params, onMessage, signal)
          })
        }).catch(reject)
      })
    }

    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    const onMessage: OnMessageFactory = (id, done) => message => {
      const response = ((message as any).json ??= JSON.parse(
        message.data
      )) as Response
      if (response.id !== id) return
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
      return connect(client, ws => {
        return sendRequest(
          ws,
          method,
          params,
          onMessage,
          signal,
          stream.readable
        )
      })
    }).catch(error => {
      writer.abort(error)
    })

    return stream.readable
  }
}

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
  nextId: number
  activeRequests: number
  idleTimeout: any
}

const connections = new WeakMap<WebSocket, ConnectionState>()

function connect<T>(client: Client, callback: (ws: WebSocket) => T) {
  const ws = client.ws
  if (ws && ws.readyState < WebSocket.CLOSING) {
    return callback(ws)
  }
  return new Promise<T>((resolve, reject) => {
    const ws = (client.ws = new WebSocket(getWebSocketURL(client.options)))
    const onError = () => {
      reject(new NetworkError('WebSocket failed to connect'))
    }
    ws.addEventListener('error', onError)
    ws.addEventListener('open', () => {
      ws.removeEventListener('error', onError)
      connections.set(ws, {
        nextId: 1,
        activeRequests: 0,
        idleTimeout: null,
      })
      resolve(callback(ws))
    })
  })
}

function createMessage(method: string, params: any[], id?: number) {
  return JSON.stringify({ method, params, id })
}

function sendMessage(
  ws: WebSocket,
  message: string,
  isCancelled?: () => boolean | undefined
) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(message)
  } else {
    ws.addEventListener('open', () => {
      if (!isCancelled?.()) {
        ws.send(message)
      }
    })
  }
}

type OnMessageFactory = (
  id: number,
  end: () => void
) => (message: MessageEvent) => void

function sendRequest(
  ws: WebSocket,
  method: string,
  params: any[],
  getListener: OnMessageFactory,
  signal?: AbortSignal,
  readable?: ReadableStream
) {
  return new Promise<void>((resolve, reject) => {
    const state = connections.get(ws)!

    // This flag is only used when the websocket is still connecting. Once
    // it's finally connected, this flag ensures no message is sent if the
    // request is cancelled.
    let cancelled = false

    if (signal) {
      signal.throwIfAborted()
      signal.addEventListener('abort', () => {
        onRequestEnded(ws, state, onResponse, onClose)
        reject(signal.reason)

        // Attempt to notify the server that the request was cancelled.
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(createMessage('.cancel', [id]))
        } else {
          cancelled = true
        }
      })
    }

    if (readable) {
      readable.cancel = function (reason) {
        onRequestEnded(ws, state, onResponse, onClose)
        resolve()

        // Attempt to notify the server that the request was cancelled.
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(createMessage('.cancel', [id]))
        } else {
          cancelled = true
        }

        // Restore the original cancel method.
        this.cancel = Object.getPrototypeOf(this).cancel
        return this.cancel(reason)
      }
    }

    const id = state.nextId++
    const request = createMessage(method, params, id)
    const onResponse = getListener(id, () => {
      onRequestEnded(ws, state, onResponse, onClose)
      resolve()
    })

    const onClose = (event: CloseEvent) => {
      if (event.wasClean) {
        resolve()
      } else {
        reject(new Error('Connection lost'))
      }
    }

    ws.addEventListener('message', onResponse)
    ws.addEventListener('close', onClose)

    sendMessage(ws, request, () => cancelled)

    state.activeRequests++
    clearTimeout(state.idleTimeout)
  })
}

function onRequestEnded(
  ws: WebSocket,
  state: ConnectionState,
  onMessage: (message: MessageEvent) => void,
  onClose: (event: CloseEvent) => void
) {
  ws.removeEventListener('message', onMessage)
  ws.removeEventListener('close', onClose)

  if (--state.activeRequests === 0) {
    state.idleTimeout = setTimeout(() => ws.close(), 1000)
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
