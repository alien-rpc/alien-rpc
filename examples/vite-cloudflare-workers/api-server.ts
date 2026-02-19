import * as Type from '@sinclair/typebox/type'

export default [
  {
    path: '/hello/:name',
    method: 'GET',
    pathParams: ['name'],
    name: 'hello',
    import: () => import('./api/hello.ts'),
    format: 'json',
    requestSchema: Type.Record(Type.String(), Type.Never()),
  },
] as const
