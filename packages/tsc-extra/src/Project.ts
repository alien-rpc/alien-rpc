import path from 'node:path'
import { isString } from 'radashi'
import type ts from 'typescript'
import { Compiler, getCompiler } from './Compiler.js'
import { createDocumentRegistry, DocumentRegistry } from './DocumentRegistry.js'
import { FileNotFoundError } from './errors.js'
import { createTsConfigLoader, TsConfig } from './TsConfigLoader.js'

const compilerCache = new WeakMap<TsConfig, Compiler>()

export interface ProjectOptions {
  /**
   * Path to the tsconfig.json file.
   * @default 'tsconfig.json'
   */
  tsConfigFilePath?: string
  /** Compiler options that override the options in the tsconfig.json file. */
  compilerOptions?: ts.CompilerOptions
  /**
   * Whether to skip adding source files from the specified tsconfig.json.
   * @default false
   */
  skipAddingFilesFromTsConfig?: boolean
}

export type Project = Readonly<Awaited<ReturnType<typeof createProject>>>

export async function createProject(
  rootDir: string,
  options: ProjectOptions = {}
) {
  const ts = await getCompiler(rootDir)

  const loadTsConfig = createTsConfigLoader(ts)
  const tsConfigFilePath = path.resolve(
    rootDir,
    options.tsConfigFilePath ?? 'tsconfig.json'
  )
  const tsConfig = loadTsConfig(tsConfigFilePath)
  const compilerOptions = {
    ...tsConfig.options,
    ...options.compilerOptions,
  }

  compilerCache.set(tsConfig, ts)

  let projectVersion = 0
  let program: ts.Program | undefined
  let languageService: ts.LanguageService | undefined

  const documentRegistry = createDocumentRegistry(ts)

  if (!options.skipAddingFilesFromTsConfig) {
    for (const filePath of tsConfig.fileNames) {
      addSourceFileAtPath(filePath)
    }
  }

  const compilerHost: ts.CompilerHost = {
    getSourceFile: (
      filePath,
      scriptTargetOrOptions,
      _onError,
      shouldCreateNewSourceFile
    ) => {
      filePath = ts.getNormalizedAbsolutePath(filePath)
      if (shouldCreateNewSourceFile) {
        return documentRegistry.addSourceFile(
          ts.createLanguageServiceSourceFile(
            filePath,
            ts.ScriptSnapshot.fromString(''),
            scriptTargetOrOptions,
            projectVersion.toString(),
            false,
            undefined
          )
        )
      }
      let sourceFile = documentRegistry.getSourceFile(filePath)
      if (sourceFile == null) {
        sourceFile = addSourceFileAtPathIfExists(filePath)
        if (sourceFile != null) {
          documentRegistry.addSourceFile(sourceFile)
        }
      }
      return sourceFile
    },
    // getSourceFileByPath: (...) => {}, // not providing these will force it to use the file name as the file path
    // getDefaultLibLocation: (...) => {},
    getDefaultLibFileName: ts.getDefaultLibFileName,
    writeFile() {
      throw new Error('Not implemented')
    },
    directoryExists: ts.sys.directoryExists,
    fileExists: ts.sys.fileExists,
    getCanonicalFileName: ts.getNormalizedAbsolutePath,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getDirectories: ts.sys.getDirectories,
    getEnvironmentVariable: ts.sys.getEnvironmentVariable,
    getNewLine: () => ts.sys.newLine,
    readFile: ts.sys.readFile,
    realpath: ts.sys.realpath,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    // resolveModuleNames: resolutionHost.resolveModuleNames,
    // resolveTypeReferenceDirectives:
    //   resolutionHost.resolveTypeReferenceDirectives,
  }

  function createSourceFile(
    filePath: string,
    sourceFileText: string = '',
    options?: { scriptKind?: ts.ScriptKind }
  ): ts.SourceFile {
    filePath = ts.getNormalizedAbsolutePath(filePath)
    return documentRegistry.createOrUpdateSourceFile(
      filePath,
      compilerOptions,
      ts.ScriptSnapshot.fromString(sourceFileText),
      options?.scriptKind
    )
  }

  function addSourceFileAtPathIfExists(
    filePath: string,
    options?: { scriptKind?: ts.ScriptKind }
  ): ts.SourceFile | undefined {
    filePath = ts.getNormalizedAbsolutePath(filePath)
    const fileText = ts.sys.readFile(filePath, 'utf-8')
    if (fileText != null) {
      return createSourceFile(filePath, fileText, options)
    }
  }

  function addSourceFileAtPath(
    filePath: string,
    options?: { scriptKind?: ts.ScriptKind }
  ): ts.SourceFile {
    const sourceFile = addSourceFileAtPathIfExists(filePath, options)
    if (sourceFile == null) {
      throw new FileNotFoundError(ts.getNormalizedAbsolutePath(filePath))
    }
    return sourceFile
  }

  function incrementVersion(sourceFile: ts.SourceFile) {
    let version = sourceFile.version || '-1'
    const parsedVersion = parseInt(version, 10)
    if (isNaN(parsedVersion)) {
      version = '0'
    } else {
      version = (parsedVersion + 1).toString()
    }
    sourceFile.version = version
  }

  function ensureScriptSnapshot(sourceFile: ts.SourceFile) {
    sourceFile.scriptSnapshot ??= ts.ScriptSnapshot.fromString(sourceFile.text)
  }

  function updateSourceFile(
    filePath: string,
    sourceFileText: string,
    options?: { scriptKind?: ts.ScriptKind }
  ): ts.SourceFile
  function updateSourceFile(newSourceFile: ts.SourceFile): ts.SourceFile
  function updateSourceFile(
    filePathOrSourceFile: string | ts.SourceFile,
    sourceFileText?: string,
    options?: { scriptKind?: ts.ScriptKind }
  ) {
    if (typeof filePathOrSourceFile === 'string') {
      return createSourceFile(filePathOrSourceFile, sourceFileText, options)
    }

    // ensure this has the language service properties set
    incrementVersion(filePathOrSourceFile)
    ensureScriptSnapshot(filePathOrSourceFile)

    return documentRegistry.addSourceFile(filePathOrSourceFile)
  }

  /**
   * Removes the source file at the provided file path.
   * @param filePath - File path of the source file.
   */
  function removeSourceFile(filePath: string): void
  /**
   * Removes the provided source file based on its `fileName`.
   * @param sourceFile - Source file to remove.
   */
  function removeSourceFile(sourceFile: ts.SourceFile): void
  function removeSourceFile(filePathOrSourceFile: string | ts.SourceFile) {
    documentRegistry.removeSourceFile(
      ts.getNormalizedAbsolutePath(
        typeof filePathOrSourceFile === 'string'
          ? filePathOrSourceFile
          : filePathOrSourceFile.fileName
      )
    )
  }

  /**
   * Gets a source file by a file name or file path. Throws an error if it doesn't exist.
   * @param fileNameOrPath - File name or path that the path could end with or equal.
   */
  function getSourceFileOrThrow(fileNameOrPath: string): ts.SourceFile
  /**
   * Gets a source file by a search function. Throws an error if it doesn't exist.
   * @param searchFunction - Search function.
   */
  function getSourceFileOrThrow(
    searchFunction: (file: ts.SourceFile) => boolean
  ): ts.SourceFile
  function getSourceFileOrThrow(
    fileNameOrSearchFunction: string | ((file: ts.SourceFile) => boolean)
  ): ts.SourceFile {
    const sourceFile = getSourceFileInternal(fileNameOrSearchFunction)
    if (sourceFile != null) {
      return sourceFile
    }

    // explain to the user why it couldn't find the file
    if (typeof fileNameOrSearchFunction === 'string') {
      const fileNameOrPath = ts.normalizeSlashes(fileNameOrSearchFunction)
      if (
        ts.pathIsAbsolute(fileNameOrPath) ||
        fileNameOrPath.indexOf('/') >= 0
      ) {
        const errorFileNameOrPath = ts.getNormalizedAbsolutePath(fileNameOrPath)
        throw new Error(
          `Could not find source file in project at the provided path: ${errorFileNameOrPath}`
        )
      } else {
        throw new Error(
          `Could not find source file in project with the provided file name: ${fileNameOrSearchFunction}`
        )
      }
    } else {
      throw new Error(
        `Could not find source file in project based on the provided condition.`
      )
    }
  }

  /**
   * Gets a source file by a file name or file path. Returns undefined if none exists.
   * @param fileNameOrPath - File name or path that the path could end with or equal.
   */
  function getSourceFile(fileNameOrPath: string): ts.SourceFile | undefined
  /**
   * Gets a source file by a search function. Returns undefined if none exists.
   * @param searchFunction - Search function.
   */
  function getSourceFile(
    searchFunction: (file: ts.SourceFile) => boolean
  ): ts.SourceFile | undefined
  function getSourceFile(
    fileNameOrSearchFunction: string | ((file: ts.SourceFile) => boolean)
  ): ts.SourceFile | undefined {
    return getSourceFileInternal(fileNameOrSearchFunction)
  }

  function getSourceFileInternal(
    fileNameOrSearchFunction: string | ((file: ts.SourceFile) => boolean)
  ): ts.SourceFile | undefined {
    const filePathOrSearchFunction = getFilePathOrSearchFunction()

    if (isString(filePathOrSearchFunction)) {
      // when a file path is specified, return even source files not in the project
      return documentRegistry.getSourceFile(filePathOrSearchFunction)
    }

    return selectSmallestDirPathResult(
      (function* () {
        for (const sourceFile of getSourceFiles()) {
          if (filePathOrSearchFunction(sourceFile)) yield sourceFile
        }
      })()
    )

    function getFilePathOrSearchFunction():
      | string
      | ((file: ts.SourceFile) => boolean) {
      if (typeof fileNameOrSearchFunction === 'function') {
        return fileNameOrSearchFunction
      }
      const fileNameOrPath = ts.normalizeSlashes(fileNameOrSearchFunction)
      if (
        ts.pathIsAbsolute(fileNameOrPath) ||
        fileNameOrPath.indexOf('/') >= 0
      ) {
        return ts.getNormalizedAbsolutePath(fileNameOrPath)
      }
      return def =>
        ts.containsPath(
          def.fileName,
          fileNameOrPath,
          !ts.sys.useCaseSensitiveFileNames
        )
    }

    function selectSmallestDirPathResult(results: Iterable<ts.SourceFile>) {
      let result: ts.SourceFile | undefined
      // Select the result with the shortest directory path... this could be more efficient
      // and better, but it will do for now...
      for (const sourceFile of results) {
        if (
          result == null ||
          ts.getDirectoryPath(sourceFile.fileName).length <
            ts.getDirectoryPath(result.fileName).length
        )
          result = sourceFile
      }
      return result
    }
  }

  /** Gets the source files in the project. */
  function getSourceFiles() {
    return documentRegistry.getSourceFiles()
  }

  /**
   * Formats an array of diagnostics with their color and context into a string.
   * @param diagnostics - Diagnostics to get a string of.
   * @param options - Collection of options. For example, the new line character to use (defaults to the OS' new line character).
   */
  function formatDiagnosticsWithColorAndContext(
    diagnostics: ReadonlyArray<ts.Diagnostic>
  ) {
    return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getCanonicalFileName: ts.getNormalizedAbsolutePath,
      getNewLine: () => ts.sys.newLine,
    })
  }

  /**
   * Creates a new program.
   * Note: You should get a new program any time source files are added, removed, or changed.
   */
  function createProgram(options?: ts.CreateProgramOptions): ts.Program {
    const oldProgram = program
    return (program = ts.createProgram({
      rootNames: Array.from(documentRegistry.getSourceFilePaths()),
      options: Object.assign({}, compilerOptions),
      host: compilerHost,
      oldProgram,
      configFileParsingDiagnostics: tsConfig.errors,
      ...options,
    }))
  }

  /**
   * Adds the source files the project's source files depend on to the project.
   * @remarks
   * * This should be done after source files are added to the project, preferably once to
   * avoid doing more work than necessary.
   * * This is done by default when creating a Project and providing a tsconfig.json and
   * not specifying to not add the source files.
   */
  function resolveSourceFileDependencies() {
    // creating a program will resolve any dependencies
    createProgram()
  }

  return {
    rootDir,
    compilerPath: ts.resolvedCompilerPath,
    compilerVersion: ts.version,
    compilerOptions,

    // TypeScript configuration
    tsConfig,
    tsConfigFilePath,
    loadTsConfig,

    // Source file management
    addSourceFileAtPath,
    addSourceFileAtPathIfExists,
    createSourceFile,
    getSourceFile,
    getSourceFileOrThrow,
    getSourceFiles,
    removeSourceFile,
    resolveSourceFileDependencies,
    updateSourceFile,

    // Type checking
    getTypeChecker() {
      return (program || createProgram()).getTypeChecker()
    },
    getProgram() {
      return program || createProgram()
    },
    createProgram,

    // Language service
    getLanguageService() {
      return (languageService ??= ts.createLanguageService(
        getLanguageServiceHost(
          ts,
          compilerOptions,
          documentRegistry,
          () => projectVersion.toString(),
          () => (projectVersion++).toString()
        ),
        documentRegistry
      ))
    },

    // Module resolution
    getModuleResolutionHost(): ts.ModuleResolutionHost {
      return ts.sys
    },

    // Diagnostics
    formatDiagnosticsWithColorAndContext,
  }
}

/**
 * Wrap the `createProject` function to add additional functionality to the
 * project.
 */
export const createProjectFactory =
  <Extension extends object, Options extends ProjectOptions>(
    extension: (project: Project, options: Options, ts: Compiler) => Extension
  ) =>
  async (rootDir: string, options?: Options): Promise<Project & Extension> => {
    const project = await createProject(rootDir, options)
    const newProperties = extension(
      project,
      (options ?? {}) as Options,
      compilerCache.get(project.tsConfig)!
    )
    return Object.defineProperties(
      project as any,
      Object.getOwnPropertyDescriptors(newProperties)
    )
  }

function getLanguageServiceHost(
  ts: Compiler,
  compilerOptions: ts.CompilerOptions,
  documentRegistry: DocumentRegistry,
  getProjectVersion: () => string,
  getProjectVersionThenIncrement: () => string
): ts.LanguageServiceHost {
  return {
    getCompilationSettings: () => Object.assign({}, compilerOptions),
    getNewLine: () => ts.sys.newLine,
    getProjectVersion,
    getScriptFileNames: () => Array.from(documentRegistry.getSourceFilePaths()),
    getScriptVersion: filePath => {
      filePath = ts.getNormalizedAbsolutePath(filePath)
      const sourceFile = documentRegistry.getSourceFile(filePath)
      if (sourceFile == null) {
        // note(aleclarson): not sure why the increment is done here
        return getProjectVersionThenIncrement()
      }
      return sourceFile.version
    },
    getScriptSnapshot: filePath => {
      filePath = ts.getNormalizedAbsolutePath(filePath)
      let sourceFile = documentRegistry.getSourceFile(filePath)
      if (sourceFile == null) {
        const fileText = ts.sys.readFile(filePath, 'utf-8')
        if (fileText != null) {
          sourceFile = documentRegistry.createOrUpdateSourceFile(
            filePath,
            compilerOptions,
            ts.ScriptSnapshot.fromString(fileText),
            undefined
          )
        }
      }
      return sourceFile
        ? ts.ScriptSnapshot.fromString(sourceFile.getFullText())
        : undefined
    },
    getDefaultLibFileName: ts.getDefaultLibFileName,
    directoryExists: ts.sys.directoryExists,
    fileExists: ts.sys.fileExists,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getDirectories: ts.sys.getDirectories,
    readFile: ts.sys.readFile,
    realpath: ts.sys.realpath,
    useCaseSensitiveFileNames: () => ts.sys.useCaseSensitiveFileNames,
    // resolveModuleNames: resolutionHost.resolveModuleNames,
    // resolveTypeReferenceDirectives:
    //   resolutionHost.resolveTypeReferenceDirectives,
    // getResolvedModuleWithFailedLookupLocationsFromCache:
    //   resolutionHost.getResolvedModuleWithFailedLookupLocationsFromCache,
  }
}
