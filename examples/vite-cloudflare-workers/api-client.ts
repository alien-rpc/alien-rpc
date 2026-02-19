import type { Route } from 'alien-rpc/client'

export default {
  hello: {
    path: 'hello/:name',
    method: 'GET',
    pathParams: ['name'],
    arity: 2,
    format: 'json',
  } as Route<
    (pathParams: { name: string }) => Promise<{ message: `Hello, ${string}!` }>
  >,
}
