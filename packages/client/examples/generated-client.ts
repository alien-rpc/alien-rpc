import { defineClient, type Route } from '@alien-rpc/client'

const routes = {
  hello: {
    path: 'hello/:name',
    method: 'GET',
    pathParams: ['name'],
    arity: 2,
    format: 'json',
  } as Route<(pathParams: { name: string }) => Promise<{ message: string }>>,
}

const api = defineClient(routes, {
  prefixUrl: 'https://example.test/api/',
  fetch: async request => {
    const name = new URL(request.url).pathname.split('/').at(-1) ?? 'friend'

    return new Response(
      JSON.stringify({ message: `Hello, ${decodeURIComponent(name)}!` }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  },
})

console.log(await api.hello('Ada'))
