import { compileRoutes } from '@alien-rpc/service'
import { chain } from 'alien-middleware'
// @ts-ignore
import routes from './api-server'

const handler = chain(compileRoutes(routes, { prefix: '/api/' }))

export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      return await (handler as any)({
        request,
        url,
        setHeader: () => {}
      })
    }
  }
}
