import { bodylessMethods } from '@alien-rpc/route'
import * as jsonQS from '@json-qs/json-qs'
import { buildPath } from 'pathic'
import { isPromise, isString, omit } from 'radashi'
import jsonFormat from '../formats/json.js'
import responseFormat from '../formats/response.js'
import {
  RequestOptions,
  ResultFormatter,
  Route,
  RouteProtocol,
} from '../types.js'
import { joinURL } from '../utils/joinURL.js'

// The default protocol
export default {
  name: 'http',
  getURL(route, { prefixUrl = location.origin }) {
    if (route.pathParams.length) {
      return params => joinURL(prefixUrl, buildPath(route.path, params))
    }
    return joinURL(prefixUrl, route.path)
  },
  createFunction(route, client) {
    const format = resolveResultFormat(route.format)

    return (
      arg: unknown,
      options = route.arity === 1
        ? (arg as RequestOptions | undefined)
        : undefined
    ) => {
      let params: Record<string, any> | undefined
      if (route.arity === 2 && arg != null) {
        if (Object.getPrototypeOf(arg) === Object.prototype) {
          params = arg
        } else if (route.pathParams.length) {
          params = { [route.pathParams[0]]: arg }
        } else {
          throw new Error('No path parameters found for route: ' + route.path)
        }
      }

      let path = buildPath(route.path, params ?? {})
      let body: unknown

      if (bodylessMethods.has(route.method)) {
        if (params) {
          const query = jsonQS.encode(params, {
            skippedKeys: route.pathParams,
          })
          if (query) {
            path += '?' + query
          }
        }
        if (route.method === 'GET' && client.options.resultCache.has(path)) {
          return format.mapCachedResult(
            client.options.resultCache.get(path),
            client
          )
        }
      } else if (params) {
        body = omit(params, route.pathParams)
      }

      const promisedResponse = client.fetch(path, {
        ...options,
        json: body,
        method: route.method,
      })

      if (client.options.errorMode === 'return') {
        const result = format.parseResponse(promisedResponse, client)
        if (isPromise(result)) {
          return result.then(
            result => [undefined, result],
            error => [error, undefined]
          )
        }
        return result
      }
      return format.parseResponse(promisedResponse, client)
    }
  },
} satisfies RouteProtocol<Route>

function resolveResultFormat(format: Route['format']): ResultFormatter {
  if (format === 'response') {
    return responseFormat
  }
  if (format === 'json') {
    return jsonFormat
  }
  if (isString(format)) {
    throw new Error('Unsupported route format: ' + format)
  }
  return format
}
