import * as Type from '@sinclair/typebox/type'

export default [
  {
    path: '/hello/:name',
    method: 'GET',
    pathParams: ['name'],
    name: 'hello',
    import: () => import('./api/hello.ts'),
    format: 'json',
    pathSchema: Type.Object(
      {
        name: MiddlewareContext,
      },
      { additionalProperties: false }
    ),
  },
] as const
