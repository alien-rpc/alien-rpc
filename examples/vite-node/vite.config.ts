import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5151,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
