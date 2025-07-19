import { existsSync } from 'fs'
import { dirname, join, parse } from 'path'

export async function loadConfigFile(cwd: string) {
  const { root } = parse(cwd)

  let tsxPath: string | undefined
  try {
    tsxPath = import.meta.resolve('tsx/esm/api', join(cwd, 'package.json'))
  } catch {}

  let configPath: string | undefined
  for (let dir = cwd; ; dir = dirname(dir)) {
    if (tsxPath) {
      configPath = join(dir, 'alien-rpc.config.ts')
      if (existsSync(configPath)) {
        const tsx = (await import(tsxPath)) as typeof import('tsx/esm/api')
        const { default: config } = await tsx.tsImport(
          'file://' + configPath,
          import.meta.url
        )
        return { config, configPath }
      }
    }

    configPath = join(dir, 'alien-rpc.config.js')
    if (existsSync(configPath)) {
      const { default: config } = await import(configPath + '?t=' + Date.now())
      return { config, configPath }
    }

    if (dir === root) {
      return { config: null, configPath: null }
    }
  }
}
