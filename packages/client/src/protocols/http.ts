import { bodylessMethods } from '@alien-rpc/route'
import * as jsonQS from '@json-qs/json-qs'
import { buildPath } from 'pathic'
import { isPromise, isString, omit } from 'radashi'
import parseJsonResponse from '../formats/json.js'
import { kClientProperty, kRouteProperty } from '../symbols.js'
import {
  RequestOptions,
  ResponseParser,
  Route,
  RouteProtocol,
} from '../types.js'

// The default protocol
export default {
  name: 'http',
  createFunction(route, client, routeName) {
    const parseResponse = getResponseParser(route.format)

    // Use this strange assignment syntax to ensure the function's name
    // matches the route name.
    const { [routeName]: routeFunction } = {
      [routeName](
        arg: unknown,
        options = route.arity === 1
          ? (arg as RequestOptions | undefined)
          : undefined
      ) {
        let params: Record<string, any> | undefined
        if (route.arity === 2 && arg != null) {
          if (Object.getPrototypeOf(arg) === Object.prototype) {
            params = arg
          } else if (route.pathParams) {
            params = { [route.pathParams[0]]: arg }
          } else {
            throw new Error('No path parameters found for route: ' + route.path)
          }
        }

        let path = buildPath(route.path, params ?? {})
        let body: unknown
        let query: string | undefined

        if (bodylessMethods.has(route.method)) {
          if (params) {
            query = jsonQS.encode(params, {
              skippedKeys: route.pathParams,
            })
          }
        } else if (params) {
          body = route.pathParams ? omit(params, route.pathParams) : params
        }

        const promisedResponse = client.fetch(path, {
          ...options,
          json: body,
          method: route.method,
          query,
        })

        if (client.options.errorMode === 'return') {
          const result = parseResponse(promisedResponse, client)
          if (isPromise(result)) {
            return result.then(
              result => [undefined, result],
              error => [error, undefined]
            )
          }
          return result
        }
        return parseResponse(promisedResponse, client)
      },
    }

    Object.defineProperty(routeFunction, kRouteProperty, { value: route })
    Object.defineProperty(routeFunction, kClientProperty, { value: client })

    return routeFunction
  },
} satisfies RouteProtocol<Route>

const passThrough = <T>(value: T) => value

function getResponseParser(format: Route['format']): ResponseParser {
  if (format === 'response') {
    return passThrough
  }
  if (format === 'json') {
    return parseJsonResponse
  }
  if (isString(format)) {
    throw new Error('Unsupported route format: ' + format)
  }
  return format.parse
}
