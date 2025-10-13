export type UserConfig = {
  /**
   * Paths and globs that may export `route()` definitions.
   */
  include: string[]
  /**
   * Where to emit the generated files.
   * @default './'
   */
  outDir?: string
  /**
   * The path to the `tsconfig.json` file.
   * @default './tsconfig.json'
   */
  tsConfigFile?: string
  /**
   * Where to emit the server file, relative to outDir.
   * @default './server/generated/api.ts'
   */
  serverOutFile?: string
  /**
   * Where to emit the client file, relative to outDir.
   * @default './client/generated/api.ts'
   */
  clientOutFile?: string
  /**
   * The current version of your API, prefixed to each route path.
   */
  versionPrefix?: string
  /**
   * Do not format the generated files.
   * @default false
   */
  noFormat?: boolean
}

/**
 * Use this in your `alien-rpc.config.ts` file for autocompletion and type
 * checking.
 *
 * @example
 * ```ts
 * import { defineConfig } from 'alien-rpc/config'
 *
 * export default defineConfig({
 *   outDir: 'src/generated',
 * })
 * ```
 */
export function defineConfig(config: UserConfig | readonly UserConfig[]) {
  return config
}
