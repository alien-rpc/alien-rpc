import { compileRoutes } from '@alien-rpc/service'
import { createServer } from '@hattip/adapter-node'
import { chain } from 'alien-middleware'
import routes from './api-server.ts'

const handler = chain(compileRoutes(routes, { prefix: '/api/' }))

createServer(async ctx => {
  return await handler(ctx)
}).listen(3001, () => {
  console.log('API Server running at http://localhost:3001')
})
