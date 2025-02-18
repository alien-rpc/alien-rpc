import { TArray } from '@sinclair/typebox'
import { Decode } from '@sinclair/typebox/value'
import {
  Hooks,
  PeerContext,
  WebSocketAdapter,
  WebSocketAdapterOptions,
} from 'hattip-ws'
import { isError } from 'radashi'
import { importRoute } from './internal/importRoute'
import { JSONCodable, Promisable } from './internal/types'
import { JsonResponse } from './response'
import { RouteList } from './types'

export function isWebSocketRoute(route: any): route is ws.Route {
  return !!route && route.protocol === 'ws'
}

function isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
  return !!value && typeof value === 'object' && Symbol.asyncIterator in value
}

export namespace ws {
  export function compileRoutes<
    TPlatform,
    TRequest extends object,
    TResponse extends object,
  >(
    routes: RouteList,
    createAdapter: (
      options: WebSocketAdapterOptions<TPlatform, TRequest, TResponse>
    ) => WebSocketAdapter<TPlatform>,
    hooks?: Partial<Hooks<TPlatform, TRequest, TResponse>>
  ) {
    const wsRoutes: Record<string, ws.Route> = Object.create(null)
    for (const route of routes) {
      if (isWebSocketRoute(route)) {
        wsRoutes[route.name] = route
      }
    }

    return createAdapter({
      hooks: {
        ...hooks,
        async message(peer, message) {
          if (hooks?.message) {
            await hooks.message(peer, message)
          }

          let { method, params, id } = message.json() as {
            method: string
            params: any[]
            id?: number
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

            const handler = (await importRoute(route)) as RouteHandler
            const endHandlers: (() => void)[] = []

            try {
              await handler(...params, {
                ...peer.context,
                id: peer.id,
                ip: peer.remoteAddress,
                signal: null,
                addEventListener(event, handler) {
                  if (event === 'end') {
                    endHandlers.push(handler)
                  }
                },
              })
            } catch (error) {
              console.error(error)
            } finally {
              endHandlers.forEach(handler => handler())
            }
          } else {
            const pendingRequests = (peer.context._pendingRequests ??=
              new Map()) as Map<number, AbortController>

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

            const handler = (await importRoute(route)) as RouteHandler
            const endHandlers: (() => void)[] = []

            const ctrl = new AbortController()
            pendingRequests.set(id, ctrl)

            try {
              const result: JSONCodable | AsyncIterable<JSONCodable> =
                await handler(...params, {
                  ...peer.context,
                  id: peer.id,
                  ip: peer.remoteAddress,
                  signal: ctrl.signal,
                  addEventListener(event, handler) {
                    if (event === 'end') {
                      endHandlers.push(handler)
                    }
                  },
                })

              if (isAsyncIterable(result)) {
                for await (const chunk of result) {
                  peer.send({ id, result: chunk })
                }
                peer.send({ id, close: true })
              } else {
                peer.send({ id, result })
              }
            } catch (error) {
              peer.send({
                id,
                error:
                  error instanceof Response
                    ? {
                        code: error.status,
                        message: error.statusText,
                        ...(error as JsonResponse<any>).decodedBody,
                      }
                    : {
                        code: 500,
                        message: isError(error) ? error.message : String(error),
                      },
              })
            } finally {
              pendingRequests.delete(id)
              endHandlers.forEach(handler => handler())
            }
          }
        },
        async close(peer, details) {
          if (hooks?.close) {
            await hooks.close(peer, details)
          }

          const pendingRequests = peer.context._pendingRequests as Map<
            number,
            AbortController
          >
          for (const ctrl of pendingRequests.values()) {
            ctrl.abort()
          }
        },
      },
    })
  }

  /**
   * WebSocket routes have their own `RequestContext` type that is derived
   * from the `@hattip/compose`-provided `RequestContext`. Therefore, any
   * properties you add to the latter will also be available on the former.
   */
  export interface RequestContext<TPlatform = unknown>
    extends PeerContext<TPlatform> {
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
     * will be aborted. Does not exist for WebSocket routes that don't
     * return anything (AKA “notification routes”).
     */
    readonly signal: AbortSignal | null
    /**
     * Register a handler for when the request is either aborted by the
     * client or completed.
     */
    addEventListener(event: 'end', handler: () => void): void
  }

  export type RouteIterableResult = AsyncIterable<JSONCodable>

  export type RouteResult = Promisable<JSONCodable | RouteIterableResult | void>

  declare const RouteHandler: unique symbol

  export type RouteHandler<
    TParams extends any[] = any[],
    TPlatform = any,
    TResult extends RouteResult = any,
  > = ((...args: [...TParams, RequestContext<TPlatform>]) => TResult) &
    typeof RouteHandler

  export interface Route {
    protocol: 'ws'
    name: string
    import: () => Promise<any>
    requestSchema?: TArray
  }
}
