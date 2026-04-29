import {
  compileRoutes,
  route,
  type RequestContext,
  type RouteList,
} from '@alien-rpc/service'

const hello = route('/hello/:name').get(async name => {
  return { message: `Hello, ${name}!` }
})

const routes = [
  {
    path: '/hello/:name',
    method: 'GET',
    pathParams: ['name'],
    name: 'hello',
    import: async () => ({ hello }),
    format: 'json',
  },
] satisfies RouteList

const handler = compileRoutes(routes)
const request = new Request('https://example.test/hello/Ada')
const responseHeaders = new Headers()

const response = await handler({
  request,
  url: new URL(request.url),
  setHeader(name: string, value: string) {
    responseHeaders.set(name, value)
  },
} as RequestContext)

if (!response) {
  throw new Error('Route did not match')
}

console.log({
  headers: Object.fromEntries(responseHeaders),
  body: await response.json(),
})
