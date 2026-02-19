import type { TSchema } from '@sinclair/typebox'
import { Decode } from '@sinclair/typebox/value'
import { AnyMiddlewareChain, MiddlewareChain } from 'alien-middleware'
import type {
  ExtractHooks,
  Peer,
  PeerContext,
  WebSocketAdapter,
  WebSocketAdapterOptions,
} from 'alien-ws'
import { isError } from 'radashi'
import {
  firstLeafError,
  getStackTrace,
  isDecodeCheckError,
  isDecodeError,
  type ValueError,
} from './errorUtils.js'
import { importRoute } from './internal/importRoute.js'
import type { Promisable } from './internal/types.js'
import type { JSONCodable } from './json/types.js'
import { JSONResponse } from './response.js'
import { RouteFactory } from './route.js'
import type { RouteList } from './types.js'

export function isWebSocketRoute(route: any): route is ws.Route {
  return !!route && route.protocol === 'ws'
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return !!value && typeof value === 'object' && Symbol.asyncIterator in value
}

function createWebSocketContext<TMiddleware extends MiddlewareChain>(
  peer: Peer<PeerContext<TMiddleware>>,
  deferQueue: ((reason?: any) => void)[],
  signal?: AbortSignal
): ws.RequestContext<TMiddleware> {
  const { request, ...context } = peer.context as PeerContext<TMiddleware>

  return {
    ...context,
    id: peer.id,
    ip: peer.remoteAddress,
    signal: signal ?? request.signal,
    headers: request.headers,
    defer(handler: (reason?: any) => Promisable<void>) {
      deferQueue.push(handler)
    },
  }
}

export namespace ws {
  export function compileRoutes<TAdapter extends WebSocketAdapter>(
    routes: RouteList,
    createAdapter: (options: WebSocketAdapterOptions) => TAdapter,
    hooks?: Partial<ExtractHooks<TAdapter>>
  ) {
    const wsRoutes: Record<string, ws.Route> = Object.create(null)
    for (const route of routes) {
      if (isWebSocketRoute(route)) {
        wsRoutes[route.name] = route
      }
    }

    const pendingRequests = new WeakMap<object, Map<number, AbortController>>()
    const getPendingRequests = (context: object) => {
      let requests = pendingRequests.get(context)
      if (!requests) {
        requests = new Map()
        pendingRequests.set(context, requests)
      }
      return requests
    }

    return createAdapter({
      hooks: {
        ...hooks,
        async message(peer, message) {
          if (hooks?.message) {
            await hooks.message(peer, message)
          }

          let { method, params, id } = message.json<{
            method: string
            params: any[]
            id?: number
          }>()

          if (method === '.ping') {
            return void peer.send({ pong: true })
          }

          if (id === undefined) {
            const route = wsRoutes[method]
            if (!route) {
              return console.error(
                `Received client notification for unknown WebSocket route: ${method}`
              )
            }

            if (route.requestSchema) {
              params = Decode(route.requestSchema, params)
            }

            const { handler } = await importRoute<RouteDefinition>(route)

            const deferQueue: ((reason?: any) => void)[] = []
            const context = createWebSocketContext(peer, deferQueue)

            let reason: any
            try {
              await handler(...params, context)
            } catch (error) {
              console.error(error)
              reason = error
            } finally {
              await Promise.allSettled(
                deferQueue.map(handler => handler(reason))
              ).catch(console.error)
            }
          } else {
            const pendingRequests = getPendingRequests(peer.context)

            if (method === '.cancel') {
              const ctrl = pendingRequests.get(id)
              pendingRequests.delete(id)
              return ctrl?.abort()
            }

            const route = wsRoutes[method]
            if (!route) {
              return void peer.send({
                error: { code: 404, message: 'Not Found' },
                id,
              })
            }

            if (route.requestSchema) {
              params = Decode(route.requestSchema, params)
            }

            const { handler } = await importRoute<RouteDefinition>(route)

            const deferQueue: ((reason?: any) => void)[] = []
            const flushDeferQueue = (reason?: any) => {
              if (deferQueue.length) {
                if (ctrl.signal.aborted) {
                  reason = ctrl.signal.reason
                }
                Promise.allSettled(
                  deferQueue.map(handler => handler(reason))
                ).catch(console.error)
                deferQueue.length = 0
              }
            }

            const ctrl = new AbortController()
            ctrl.signal.addEventListener('abort', flushDeferQueue)
            pendingRequests.set(id, ctrl)

            const context = createWebSocketContext(
              peer,
              deferQueue,
              ctrl.signal
            )

            try {
              const result: JSONCodable | AsyncIterable<JSONCodable> =
                await handler(...params, context)

              if (isAsyncIterable(result)) {
                for await (const chunk of result) {
                  peer.send({ id, result: chunk })
                }
                peer.send({ id, close: true })
              } else {
                peer.send({ id, result })
              }
              flushDeferQueue()
            } catch (error) {
              if (error instanceof Response) {
                const {
                  code = error.status,
                  message = error.statusText,
                  ...data
                } = error instanceof JSONResponse ? error.decodedBody : {}

                peer.send({
                  id,
                  error: {
                    code,
                    message,
                    data: Object.keys(data).length ? data : undefined,
                    stack:
                      process.env.NODE_ENV !== 'production' && 'stack' in error
                        ? error.stack
                        : undefined,
                  },
                })
              } else {
                const checkError = isDecodeError(error) ? error.error : error
                if (isDecodeCheckError(checkError)) {
                  const { message, path, value } = firstLeafError(
                    checkError.error
                  ) as ValueError & {
                    value: JSONCodable
                  }
                  peer.send({
                    id,
                    error: {
                      code: 400,
                      message,
                      data: { path, value },
                      stack:
                        process.env.NODE_ENV !== 'production'
                          ? getStackTrace(checkError)
                          : undefined,
                    },
                  })
                } else {
                  if (process.env.NODE_ENV !== 'production') {
                    console.error(error)
                  }
                  peer.send({
                    id,
                    error: {
                      code: 500,
                      message: isError(error) ? error.message : String(error),
                      stack:
                        process.env.NODE_ENV !== 'production' && isError(error)
                          ? getStackTrace(error)
                          : undefined,
                    },
                  })
                }
              }
              flushDeferQueue(error)
            } finally {
              pendingRequests.delete(id)
            }
          }
        },
        async close(peer, details) {
          if (hooks?.close) {
            await hooks.close(peer, details)
          }

          const pendingRequests = getPendingRequests(peer.context)
          for (const ctrl of pendingRequests.values()) {
            ctrl.abort()
          }
        },
      },
    })
  }

  /**
   * WebSocket routes have their own `RequestContext` type that is derived
   * from the `alien-middleware`-provided `RequestContext`. Therefore, any
   * properties you add to the latter will also be available on the former.
   */
  export type RequestContext<TMiddleware extends AnyMiddlewareChain = never> =
    Omit<PeerContext<TMiddleware>, 'request'> & {
      /**
       * The IP address of the client.
       */
      readonly ip: string | undefined
      /**
       * Unique random [UUID v4][1] identifier for the client.
       *
       * [1]: https://developer.mozilla.org/en-US/docs/Glossary/UUID
       */
      readonly id: string
      /**
       * If the request is cancelled or the connection is lost, the signal
       * will be aborted.
       */
      readonly signal: AbortSignal
      /**
       * The headers used in the upgrade request.
       */
      readonly headers: Headers
      /**
       * Register a handler for when the request is either aborted by the
       * client or completed.
       */
      readonly defer: (handler: (reason?: any) => Promisable<void>) => void
    }

  export type RouteContext<T extends RouteFactory<any>> =
    T extends RouteFactory<infer TMiddleware>
      ? ws.RequestContext<TMiddleware>
      : never

  export type RouteIterableResult = AsyncIterable<JSONCodable | undefined>

  export type RouteResult = Promisable<JSONCodable | RouteIterableResult | void>

  export type RouteDefinition<
    TArgs extends any[] = any[],
    TResult extends ws.RouteResult = any,
  > = {
    protocol: 'ws'
    handler: (...args: TArgs) => TResult
  }

  export interface Route {
    protocol: 'ws'
    name: string
    import: () => Promise<any>
    requestSchema?: TSchema
  }
}
