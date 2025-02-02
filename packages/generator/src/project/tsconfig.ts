import type { JumpgenFS } from 'jumpgen'
import path from 'node:path'
import { TsConfig } from 'tsc-extra'
import { Project } from '../project.js'

export type TsConfigResolution = TsConfig & {
  readonly fileName: string
}

export type TsConfigCache = ReturnType<typeof createTsConfigCache>

export function createTsConfigCache(fs: JumpgenFS, project: Project) {
  const resolveTsConfig = (configFilePath: string): TsConfigResolution => {
    return {
      ...project.loadTsConfig(configFilePath),
      fileName: configFilePath,
    }
  }

  const configFileMap = new Map<string, TsConfigResolution>()

  return {
    findUp(fromDirectory: string) {
      let cwd: string = fromDirectory
      let config: TsConfigResolution | undefined
      while (true) {
        const configFilePath = fs.findUp('tsconfig.json', {
          absolute: true,
          cwd,
        })
        if (!configFilePath) {
          return null
        }
        fs.watch(configFilePath)
        config = configFileMap.get(configFilePath)
        if (!config) {
          config = resolveTsConfig(configFilePath)
          configFileMap.set(configFilePath, config)
        }
        if (config.directories.includes(fromDirectory)) {
          return config
        }
        cwd = path.resolve(configFilePath, '../..')
      }
    },
    get(configFilePath: string) {
      return configFileMap.get(configFilePath)
    },
    invalidate(configFilePath: string) {
      configFileMap.delete(configFilePath)
    },
  }
}
