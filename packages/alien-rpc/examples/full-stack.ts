import { defineClient, type Route as ClientRoute } from 'alien-rpc/client'
import {
  compileRoutes,
  route,
  type RequestContext,
  type RouteList,
} from 'alien-rpc/service'

const hello = route('/hello/:name').get(async name => {
  return { message: `Hello, ${name}!` }
})

const serverRoutes = [
  {
    path: '/hello/:name',
    method: 'GET',
    pathParams: ['name'],
    name: 'hello',
    import: async () => ({ hello }),
    format: 'json',
  },
] satisfies RouteList

const clientRoutes = {
  hello: {
    path: 'hello/:name',
    method: 'GET',
    pathParams: ['name'],
    arity: 2,
    format: 'json',
  } as ClientRoute<
    (pathParams: { name: string }) => Promise<{ message: string }>
  >,
}

const handler = compileRoutes(serverRoutes, {
  prefix: '/api/',
})

const api = defineClient(clientRoutes, {
  prefixUrl: 'https://example.test/api/',
  fetch: request => dispatchRequest(handler, request),
})

console.log(await api.hello('Ada'))

async function dispatchRequest(
  handler: (ctx: RequestContext) => Promise<Response | undefined>,
  request: Request
) {
  const responseHeaders = new Headers()
  const ctx = {
    request,
    url: new URL(request.url),
    setHeader(name: string, value: string) {
      responseHeaders.set(name, value)
    },
  } as RequestContext

  const response = await handler(ctx)
  if (!response) {
    return new Response(null, { status: 404 })
  }

  const headers = new Headers(response.headers)
  responseHeaders.forEach((value, name) => headers.set(name, value))

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
