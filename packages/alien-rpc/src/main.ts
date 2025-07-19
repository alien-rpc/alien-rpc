#!/usr/bin/env node
import cac from 'cac'
import path from 'node:path'
import { isArray, omit } from 'radashi'
import { loadConfigFile } from './common/config.js'
import { log } from './common/log.js'
import {
  Shortcut,
  printShortcutsHelp,
  registerConsoleShortcuts,
} from './common/stdin.js'
import { UserConfig } from './config.js'

const app = cac('alien-rpc')

app
  .command('[...include]', 'Generate route definitions for your API')
  .example(
    bin =>
      `${bin} './server/src/routes/**/*.ts' --watch --serverOutFile ./server/src/api.ts --clientOutFile ./client/src/api.ts`
  )
  .option(
    '--root <path>',
    'The directory from which all other paths are relative',
    { default: './' }
  )
  .option('-w, --watch', 'Watch for changes and regenerate files')
  .option('--outDir <path>', 'Where to emit the generated files', {
    default: './',
  })
  .option('--tsConfigFile <path>', 'The path to the `tsconfig.json` file', {
    default: './tsconfig.json',
  })
  .option(
    '--serverOutFile <path>',
    'Where to emit the server file, relative to outDir',
    { default: './server/generated/api.ts' }
  )
  .option(
    '--clientOutFile <path>',
    'Where to emit the client file, relative to outDir',
    { default: './client/generated/api.ts' }
  )
  .option(
    '--versionPrefix <version>',
    'The current version of your API, prefixed to each route path'
  )
  .option('--no-format', 'Do not format the generated files')
  .option('--no-config-file', 'Do not load a config file')
  .option('--verbose', 'Print diagnostics for node_modules')
  .action(
    async (
      include: string[],
      {
        root,
        watch,
        ...options
      }: UserConfig & {
        root: string
        watch?: boolean
        noConfigFile?: boolean
        verbose?: boolean
      }
    ) => {
      const { default: create } = await import('@alien-rpc/generator')

      if (!options.noConfigFile) {
        const { config, configPath } = await loadConfigFile(process.cwd())
        if (configPath) {
          log.comment(
            'Using config file:',
            path.relative(process.cwd(), configPath)
          )
          Object.assign(options, omit(config, ['include']))
          if (include.length === 0) {
            include = config.include
          }
        }
      }

      let shortcuts: Shortcut[]
      if (watch) {
        log.enableTimestamps(true)
        registerConsoleShortcuts(
          (shortcuts = [
            [['return'], 'regenerate files', () => generator.rerun()],
          ])
        )
      }

      root = path.resolve(root)
      log('Using directory:', root)
      log.setRootDirectory(root)

      const generate = create({
        ...options,
        include,
        outDir: options.outDir ?? './',
      })

      const generator = generate({
        root,
        watch,
      })

      generator.events
        .on('start', () => {
          log('Generating...')
        })
        .on('custom', event => {
          if (event.type === 'route') {
            const { resolvedHttpRoute } = event.route
            log(
              'Generated route:',
              resolvedHttpRoute
                ? resolvedHttpRoute.method + ' ' + resolvedHttpRoute.pathname
                : `GET /ws (${event.route.name})`
            )
          } else if (event.type === 'warning') {
            log.warn(event.message)
          } else if (event.type === 'info') {
            if (isArray(event.message)) {
              log(...event.message)
            } else {
              log(event.message)
            }
          }
        })
        .on('write', file => {
          log('Writing file:', path.relative(process.cwd(), file))
        })
        .on('finish', () => {
          log.success('Your files are now up to date!')
        })
        .on('abort', () => {
          log.warn('Ending prematurely...')
        })

      await generator
      if (watch) {
        log.comment('Watching for changes...')
        printShortcutsHelp(shortcuts!)
      }
    }
  )

app.help()
app.parse()
