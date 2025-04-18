import os from 'node:os'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

const resolve = (file: string) => path.resolve(import.meta.dirname, file)

const alias = {
  '@alien-rpc/client/formats/json-seq': resolve(
    './packages/client/src/formats/json-seq.ts'
  ),
  '@alien-rpc/client': resolve('./packages/client/src/index.ts'),
  '@alien-rpc/service': resolve('./packages/service/src/index.ts'),
  '@alien-rpc/generator': resolve('./packages/generator/src/generator.ts'),
}

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globals: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    env: {
      TEST: 'alien-rpc',
    },
    isolate: false,
    testTimeout: 0,
    maxConcurrency: os.cpus().length - 1,
    forceRerunTriggers: ['**/__fixtures__/**/routes.ts'],
    alias,
  },
  server: {
    watch: {
      ignored: ['**/__fixtures__/**/tsconfig.json', '**/__fixtures__/tmp-*/**'],
    },
  },
})
