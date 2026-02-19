import { defineConfig } from 'alien-rpc/config'

export default defineConfig({
  include: ['src/api/**/*.ts'],
  outDir: 'src',
  serverOutFile: 'api-server.ts',
  clientOutFile: 'api-client.ts',
})
