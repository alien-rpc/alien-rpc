import generate from '@alien-rpc/generator'
import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = await mkdtemp(path.join(packageRoot, '.generated-'))

const run = generate({
  include: 'examples/routes.ts',
  tsConfigFile: 'examples/tsconfig.json',
  outDir,
  clientOutFile: 'client.ts',
  serverOutFile: 'server.ts',
  noFormat: true,
})

const runner = run({
  root: packageRoot,
  watch: false,
})

try {
  await runner

  console.log(`Generated manifests in ${outDir}`)
} finally {
  await runner.destroy()
  await rm(outDir, {
    recursive: true,
    force: true,
  })
}
