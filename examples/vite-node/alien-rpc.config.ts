import { defineConfig } from 'alien-rpc/config'

export default defineConfig({
  include: ['src/api/**/*.ts'],
  serverOutFile: 'src/api-server.ts',
  clientOutFile: 'src/api-client.ts',
})
