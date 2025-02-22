import { bodylessMethods } from '@alien-rpc/route'
import { formatly } from '@alloc/formatly'
import { resolve } from 'import-meta-resolve'
import { FileChange, jumpgen } from 'jumpgen'
import { S_IFREG } from 'node:constants'
import path from 'path'
import { parsePathParams } from 'pathic'
import { camel, dedent, guard, pascal, sift } from 'radashi'
import type { Event, Options, Store } from './generator-types.js'
import { createProject } from './project.js'
import { analyzeFile } from './project/analyze-file.js'
import {
  AnalyzedRoute,
  ResolvedHttpRoute,
  ResolvedWsRoute,
} from './project/analyze-route.js'
import { reportDiagnostics } from './project/diagnostics.js'
import { createSupportingTypes } from './project/supporting-types.js'
import { createTsConfigCache } from './project/tsconfig.js'
import { typeConstraints } from './type-constraints.js'

export type { Options }

export default (rawOptions: Options) =>
  jumpgen<Store, Event, void>('alien-rpc', async context => {
    const { fs, root, store, emit, changes } = context

    const options = {
      ...rawOptions,
      outDir: path.resolve(root, rawOptions.outDir),
      serverOutFile: rawOptions.serverOutFile ?? 'server/generated/api.ts',
      clientOutFile: rawOptions.clientOutFile ?? 'client/generated/api.ts',
    } satisfies Options

    const entryFilePaths = fs.scan(options.include, {
      cwd: root,
      absolute: true,
    })

    if (!entryFilePaths.length) {
      throw new Error(
        `No files matching ${JSON.stringify(options.include)} were found in ${JSON.stringify(root)}`
      )
    }

    options.serverOutFile = path.resolve(options.outDir, options.serverOutFile)
    options.clientOutFile = path.resolve(options.outDir, options.clientOutFile)

    if (isProjectInvalidated(store, changes)) {
      store.project = await createProject(root, {
        fs,
        store,
        isWatchMode: !!context.watcher,
        tsConfigFilePath: options.tsConfigFile,
      })

      emit({
        type: 'info',
        message: [
          'Using typescript@%s from',
          store.project.compilerVersion,
          store.project.compilerPath,
        ],
      })

      store.serviceModuleId = resolveModule('id', options.serverOutFile, [
        'alien-rpc/service',
        '@alien-rpc/service',
      ])
      store.clientModuleId = resolveModule('id', options.clientOutFile, [
        'alien-rpc/client',
        '@alien-rpc/client',
      ])

      store.types = createSupportingTypes(store.project, store.serviceModuleId)
      store.tsConfigCache = createTsConfigCache(fs, store.project)

      store.deletedFiles = new Set()
      store.analyzedFiles = new Map()
      store.includedFiles = new Set()
      store.directories = new Map()
    } else {
      store.types.clear()
      store.deletedFiles.clear()
      store.includedFiles.clear()
      store.directories.forEach(directory => {
        directory.seenSpecifiers.clear()
      })

      for (const change of changes) {
        if (change.type !== S_IFREG) {
          continue
        }

        const affectedFilePath = path.join(root, change.file)

        if (change.event === 'add') {
          store.project.createSourceFile(
            affectedFilePath,
            fs.read(affectedFilePath, 'utf8')
          )
        } else {
          const tsConfig = store.tsConfigCache.get(affectedFilePath)
          if (tsConfig) {
            store.tsConfigCache.invalidate(affectedFilePath)
            continue
          }

          const affectedSourceFile =
            store.project.getSourceFile(affectedFilePath)

          if (affectedSourceFile) {
            store.analyzedFiles.delete(affectedSourceFile)

            if (change.event === 'unlink') {
              const directoryPath = path.dirname(affectedSourceFile.fileName)
              const directory = store.directories.get(directoryPath)
              if (
                directory?.files.delete(affectedSourceFile) &&
                directory.files.size === 0
              ) {
                store.directories.delete(directoryPath)
              }
              store.deletedFiles.add(affectedFilePath)
              store.project.removeSourceFile(affectedFilePath)
            } else {
              store.project.updateSourceFile(
                affectedFilePath,
                fs.read(affectedFilePath, 'utf8')
              )
            }
          }
        }
      }
    }

    const { project, types, analyzedFiles, includedFiles } = store
    const { utils } = project

    project.resolveSourceFileDependencies()

    const referencedTypes = new Map<string, string>()

    const routes = Array.from(project.getSourceFiles())
      .filter(sourceFile => entryFilePaths.includes(sourceFile.fileName))
      .flatMap(sourceFile => {
        let metadata = analyzedFiles.get(sourceFile)
        if (!metadata) {
          metadata = analyzeFile(project, sourceFile, types)
          analyzedFiles.set(sourceFile, metadata)

          // Prepend the API version to all route pathnames.
          if (options.versionPrefix) {
            for (const route of metadata.routes) {
              if (route.resolvedHttpRoute) {
                route.resolvedHttpRoute.pathname = `/${options.versionPrefix}${route.resolvedHttpRoute.pathname}`
              }
            }
          }

          for (const route of metadata.routes) {
            emit({ type: 'route', route })
          }
          for (const message of metadata.warnings) {
            emit({ type: 'warning', message })
          }
        }
        fs.watch(sourceFile.fileName)
        project.collectDependencies(
          sourceFile,
          project.compilerOptions,
          project.getModuleResolutionHost()
        )
        for (const [symbol, type] of metadata.referencedTypes) {
          referencedTypes.set(symbol.name, type)
        }
        return metadata.routes
      })

    // After we've traversed the module graph, we can clean up the
    // resolution cache.
    store.directories.forEach(directory => {
      for (const specifier of directory.resolutionCache.keys()) {
        if (!directory.seenSpecifiers.has(specifier)) {
          directory.resolutionCache.delete(specifier)
        }
      }
    })

    reportDiagnostics(project, {
      verbose: options.verbose,
      ignoreFile: file => !includedFiles.has(file),
      onModuleNotFound: (specifier, importer) =>
        context.watcher &&
        project.watchMissingImport(
          importer,
          specifier,
          project.compilerOptions,
          project.getModuleResolutionHost()
        ),
    })

    if (!routes.length) {
      throw new Error('No routes were exported by the included files')
    }

    const clientDefinitions: Record<string, string[]> = {}
    const clientTypeImports = new Set<string>(['RequestOptions', 'Route'])
    const clientProtocols = new Set<string>()
    const clientFormats = new Set<string>()

    const serverDefinitions: string[] = []
    const serverImports = new Set<string>()

    const serverCheckedStringFormats = new Set<string>()
    const collectValidatedStringFormats = (content: string) => {
      for (const match of content.matchAll(
        /Type\.String\(.*?format:\s*['"](\w+)['"].*?\)/g
      )) {
        serverCheckedStringFormats.add(match[1])
      }
    }

    const serverTsConfig = store.tsConfigCache.findUp(
      path.dirname(options.serverOutFile)
    )

    const generateRequestSchema = async (
      argumentType: string,
      contentType: 'json' | 'json-qs'
    ) => {
      // Treat {} as an empty object.
      if (argumentType === '{}') {
        argumentType = 'Record<string, never>'
      }
      let schema = await project.generateRuntimeValidator(
        `type Request = ${argumentType}`
      )
      if (contentType === 'json') {
        schema = schema.replace(/\bType\.(Date)\(/g, (match, type) => {
          switch (type) {
            case 'Date':
              serverImports.add('DateString')
              return 'DateString('
          }
          return match
        })
      }
      return schema
    }

    const processHttpRoute = async (
      { name, fileName, description }: AnalyzedRoute,
      route: ResolvedHttpRoute
    ) => {
      if (description) {
        description = `/**\n${description.replace(/^/gm, ' * ')}\n */\n`
      }

      let pathSchema = ''
      if (route.pathParams && project.needsPathSchema(route.pathParams)) {
        pathSchema = (
          await project.generateRuntimeValidator(
            `type Path = ${route.pathParams}`
          )
        ).replace(/\bType\.(Number|Array)\(/g, (match, type) => {
          switch (type) {
            case 'Number':
              serverImports.add('NumberParam')
              return 'NumberParam('
            case 'Array':
              serverImports.add('ArrayParam')
              return 'ArrayParam('
          }
          return match
        })
      }

      const dataArgument = route.argumentTypes[route.pathParams ? 1 : 0]
      const requestSchema = dataArgument
        ? await generateRequestSchema(
            dataArgument,
            bodylessMethods.has(route.method) ? 'json-qs' : 'json'
          )
        : ''

      collectValidatedStringFormats(pathSchema + requestSchema)

      const handlerPath = resolveImportPath(
        options.serverOutFile,
        fileName,
        serverTsConfig?.options.allowImportingTsExtensions
      )

      const pathParams = parsePathParams(route.pathname)

      const sharedProperties = [
        `method: "${route.method}"`,
        pathParams.length && `pathParams: ${JSON.stringify(pathParams)}`,
      ]

      const serverPathname =
        route.pathname[0] === '/' ? route.pathname : `/${route.pathname}`

      const serverProperties = sift([
        `path: "${serverPathname}"`,
        ...sharedProperties,
        `name: "${name}"`,
        `import: () => import(${JSON.stringify(handlerPath)})`,
        `format: "${route.format}"`,
        pathSchema && `pathSchema: ${pathSchema}`,
        requestSchema && `requestSchema: ${requestSchema}`,
      ])

      serverDefinitions.push(`{${serverProperties.join(', ')}}`)

      const resolvedPathParams = route.pathParams
        ? stripTypeConstraints(route.pathParams)
        : 'Record<string, never>'

      const resolvedRequestData =
        dataArgument && dataArgument !== 'any' && dataArgument !== '{}'
          ? stripTypeConstraints(dataArgument)
          : 'Record<string, never>'

      const clientParamsExist =
        resolvedPathParams !== 'Record<string, never>' ||
        resolvedRequestData !== 'Record<string, never>'

      const clientParamsAreOptional =
        !clientParamsExist ||
        (utils.arePropertiesOptional(resolvedPathParams) &&
          utils.arePropertiesOptional(resolvedRequestData))

      const clientArgs: string[] = ['requestOptions?: RequestOptions']
      if (clientParamsExist) {
        clientTypeImports.add('RequestParams')
        clientArgs.unshift(
          `params${clientParamsAreOptional ? '?' : ''}: RequestParams<${resolvedPathParams}, ${resolvedRequestData}>${clientParamsAreOptional ? ' | null' : ''}`
        )
      }

      let clientReturn = route.resultType
      if (route.format === 'json-seq') {
        clientTypeImports.add('ResponseStream')
        clientReturn = `ResponseStream<${clientReturn}>`
      } else {
        clientReturn = `Promise<${clientReturn}>`
      }

      const clientPathname = route.pathname.replace(/^\//, '')

      const clientProperties = sift([
        `path: "${clientPathname}"`,
        ...sharedProperties,
        `arity: ${clientParamsExist ? 2 : 1}`,
        `format: ${
          // The "JSON sequence" format is imported, rather than being
          // included by default, so we use an identifier here.
          route.format === 'json-seq'
            ? camel(route.format)
            : `"${route.format}"`
        }`,
      ])

      const [methodName, scopeName = ''] = name.split('.').reverse()
      const scopeDefinitions = (clientDefinitions[scopeName] ??= [])

      clientFormats.add(route.format)
      scopeDefinitions.push(
        (description || '') +
          `export const ${methodName}: Route<"${clientPathname}", (${clientArgs.join(', ')}) => ${clientReturn}> = {${clientProperties.join(', ')}} as any`
      )
    }

    const processWsRoute = async (
      { name, fileName, description }: AnalyzedRoute,
      route: ResolvedWsRoute
    ) => {
      if (description) {
        description = `/**\n${description.replace(/^/gm, ' * ')}\n */\n`
      }

      const requestSchema = await generateRequestSchema(
        '[' + route.argumentTypes.join(', ') + ']',
        'json'
      )

      collectValidatedStringFormats(requestSchema)

      const handlerPath = resolveImportPath(
        options.serverOutFile,
        fileName,
        serverTsConfig?.options.allowImportingTsExtensions
      )

      serverDefinitions.push(
        `{${sift([
          `protocol: "ws"`,
          `name: "${name}"`,
          `import: () => import(${JSON.stringify(handlerPath)})`,
          requestSchema && `requestSchema: ${requestSchema}`,
        ]).join(', ')}}`
      )

      clientProtocols.add('websocket')
      const clientProperties = [
        `protocol: websocket`,
        `pattern: "${route.pattern}"`,
      ]

      const clientArgs = route.argumentNames
        .map((name, index) => `${name}: ${route.argumentTypes[index]}`)
        .concat('requestOptions?: ws.RequestOptions')

      const clientReturn =
        route.pattern === 'n'
          ? 'Promise<void>'
          : route.pattern === 'r'
            ? `Promise<${route.resultType}>`
            : `ReadableStream<${route.resultType}>`

      const [methodName, scopeName = ''] = name.split('.').reverse()
      const scopeDefinitions = (clientDefinitions[scopeName] ??= [])

      clientTypeImports.add('ws')
      scopeDefinitions.push(
        (description || '') +
          `export const ${methodName}: ws.Route<(${clientArgs.join(', ')}) => ${clientReturn}> = {${clientProperties.join(', ')}} as any`
      )
    }

    for (const route of routes) {
      if (route.resolvedHttpRoute) {
        await processHttpRoute(route, route.resolvedHttpRoute)
      } else if (route.resolvedWsRoute) {
        await processWsRoute(route, route.resolvedWsRoute)
      }
    }

    const clientTypeAliases = Array.from(referencedTypes.values()).join('\n')

    const serverTypeAliases =
      clientTypeAliases &&
      (await project.generateServerTypeAliases(
        clientTypeAliases,
        typeConstraints
      ))

    if (serverTypeAliases) {
      collectValidatedStringFormats(serverTypeAliases)
    }

    const writeServerDefinitions = (outFile: string) => {
      let imports = ''
      let sideEffects = ''

      if (serverImports.size > 0) {
        imports += `\nimport { ${[...serverImports].sort().join(', ')} } from "${store.serviceModuleId}/typebox"`
      }
      if (serverCheckedStringFormats.size > 0) {
        const sortedStringFormats = [...serverCheckedStringFormats].sort()
        const importedStringFormats = sortedStringFormats.map(
          name => pascal(name) + 'Format'
        )

        imports += `\nimport { addStringFormat, ${importedStringFormats.join(', ')} } from "${store.serviceModuleId}/formats"`

        sortedStringFormats.forEach((format, index) => {
          sideEffects += `\naddStringFormat(${JSON.stringify(format)}, ${importedStringFormats[index]})`
        })
      }

      const content = sift([
        `import * as Type from "@sinclair/typebox/type"${imports}`,
        sideEffects.trimStart(),
        serverTypeAliases,
        `export default [${serverDefinitions.join(', ')}] as const`,
      ]).join('\n\n')

      fs.write(outFile, content)
    }

    const writeClientDefinitions = (outFile: string) => {
      let imports = ''

      // Delete the two formats that are always available.
      clientFormats.delete('json')
      clientFormats.delete('response')

      if (clientFormats.size > 0) {
        imports += Array.from(
          clientFormats,
          format =>
            `\nimport ${camel(format)} from "${store.clientModuleId}/formats/${format}"`
        ).join('')
      }

      if (clientProtocols.size > 0) {
        imports += Array.from(
          clientProtocols,
          protocol =>
            `\nimport ${camel(protocol)} from "${store.clientModuleId}/protocols/${protocol}"`
        ).join('')
      }

      const content = sift([
        `import type { ${[...clientTypeImports].sort().join(', ')} } from "${store.clientModuleId}"` +
          imports,
        clientTypeAliases.replace(
          new RegExp(`\\s*&\\s*(${typeConstraints.join('|')})\\<.+?\\>`, 'g'),
          ''
        ),
        ...Object.entries(clientDefinitions).map(
          ([scopeName, methodDefinitions]) => {
            const body = methodDefinitions.join('\n\n')
            if (scopeName) {
              return dedent`
                export namespace ${scopeName} {
                  ${body}
                }
              `
            }
            return body
          }
        ),
      ]).join('\n\n')

      fs.write(outFile, content)
    }

    writeServerDefinitions(options.serverOutFile)
    writeClientDefinitions(options.clientOutFile)

    if (!options.noFormat) {
      await formatly(
        [options.serverOutFile, options.clientOutFile].map(file =>
          path.relative(options.outDir, file)
        ),
        {
          cwd: options.outDir,
          stdio: 'inherit',
        }
      )
    }
  })

function isProjectInvalidated(store: Store, changes: FileChange[]) {
  return (
    !store.project ||
    changes.some(change => change.file === store.project.tsConfigFilePath)
  )
}

function resolveImportPath(
  fromPath: string,
  toPath: string,
  allowImportingTsExtensions?: boolean
) {
  let result = path.relative(path.dirname(fromPath), toPath)

  if (!allowImportingTsExtensions) {
    result = result.replace(/\.ts$/, '.js')
  }

  if (!result.startsWith('..')) {
    result = './' + result
  }
  return result
}

function stripTypeConstraints(type: string) {
  return type.replace(
    new RegExp(` & (${typeConstraints.join('|')})(?:\<.+?\>)?`, 'g'),
    ''
  )
}

function resolveModule(
  returnKind: 'path' | 'id',
  importer: string,
  candidateIds: string[]
) {
  for (const id of candidateIds) {
    const resolvedId = guard(
      () => new URL(resolve(id, 'file://' + importer)).pathname
    )
    if (resolvedId) {
      return returnKind === 'path' ? resolvedId : id
    }
  }
  throw new Error(
    'Could not find any of the following modules: ' +
      candidateIds.join(', ') +
      '\n' +
      'from this module: ' +
      importer
  )
}
