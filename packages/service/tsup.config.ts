import { defineConfig } from '../../scripts/tsup-config'

export default defineConfig(import.meta.url, {
  external: ['../constraint.d.ts'],
})
