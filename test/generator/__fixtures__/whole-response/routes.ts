import { route } from '@alien-rpc/service'

export const test = route('/test').get(async (): Promise<Response> => {
  return new Response('Hello, world!')
})
