import type { RequestHandlerStack } from '@hattip/compose'
import type { TArray } from '@sinclair/typebox'
import { Decode } from '@sinclair/typebox/value'
import type {
  Hooks,
  PeerContext,
  WebSocketAdapter,
  WebSocketAdapterOptions,
} from 'hattip-ws'
import { isError } from 'radashi'
import { importRoute } from './internal/importRoute.js'
import type {
  InferPlatform,
  JSONCodable,
  Last,
  Promisable,
} from './internal/types.js'
import type { JsonResponse } from './response.js'
import type { RouteList } from './types.js'

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

            const handler = await importRoute<RouteDefinition['handler']>(route)

            const deferQueue: ((reason?: any) => void)[] = []
            const context: ws.RequestContext = {
              ...peer.context,
              id: peer.id,
              ip: peer.remoteAddress,
              signal: null,
              defer(handler) {
                deferQueue.push(handler)
              },
            }

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

            const handler = await importRoute<RouteDefinition['handler']>(route)

            const ctrl = new AbortController()
            pendingRequests.set(id, ctrl)

            const deferQueue: ((reason?: any) => void)[] = []
            const context: ws.RequestContext = {
              ...peer.context,
              id: peer.id,
              ip: peer.remoteAddress,
              signal: ctrl.signal,
              defer(handler) {
                deferQueue.push(handler)
              },
            }

            let reason: any
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
            } catch (error) {
              reason = error
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
              await Promise.allSettled(
                deferQueue.map(handler => handler(reason))
              ).catch(console.error)
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
    defer(handler: (reason?: any) => Promisable<void>): void
  }

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
    requestSchema?: TArray
  }
}
