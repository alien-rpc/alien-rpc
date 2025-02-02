import { memo } from 'radashi'
import type ts from 'typescript'
import { Compiler } from './Compiler.js'
import { FileNotFoundError } from './errors.js'

export type TsConfig = ts.ParsedCommandLine & {
  directories: string[]
}

export function createTsConfigLoader(ts: Compiler) {
  const directories = new Set<string>()
  const host: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    readDirectory: (rootDir, extensions, excludes, includes, depth) => {
      const result = readDirectory(
        ts,
        rootDir,
        extensions,
        excludes,
        includes,
        depth
      )
      result.directories.forEach(dir => directories.add(dir))
      return result.files
    },
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
  }

  return memo((tsConfigFilePath: string): TsConfig => {
    const text = ts.sys.readFile(tsConfigFilePath, 'utf-8')
    if (text === undefined) {
      throw new FileNotFoundError(tsConfigFilePath)
    }
    const parseResult = ts.parseConfigFileTextToJson(tsConfigFilePath, text)
    if (parseResult.error != null) {
      throw new Error(parseResult.error.messageText.toString())
    }

    directories.clear()
    const result = ts.parseJsonConfigFileContent(
      parseResult.config,
      host,
      ts.getDirectoryPath(tsConfigFilePath),
      undefined,
      tsConfigFilePath
    )

    return {
      ...result,
      directories: [...directories],
    }
  })
}

function readDirectory(
  ts: Compiler,
  rootDir: string,
  extensions: ReadonlyArray<string>,
  excludes: ReadonlyArray<string> | undefined,
  includes: ReadonlyArray<string>,
  depth?: number
) {
  const currentDir = ts.sys.getCurrentDirectory()
  const directories: string[] = []

  // start: code from TypeScript compiler source
  const regexFlag = ts.sys.useCaseSensitiveFileNames ? '' : 'i'
  const patterns = ts.getFileMatcherPatterns(
    rootDir,
    excludes || [],
    includes,
    ts.sys.useCaseSensitiveFileNames,
    currentDir
  )
  const includeDirectoryRegex =
    patterns.includeDirectoryPattern &&
    new RegExp(patterns.includeDirectoryPattern, regexFlag)
  const excludeRegex =
    patterns.excludePattern && new RegExp(patterns.excludePattern, regexFlag)
  // end

  const dirPathMatches = (absoluteName: string) => {
    // needed for the regex to match
    if (absoluteName[absoluteName.length - 1] !== '/') {
      absoluteName += '/'
    }
    // condition is from TypeScript compiler source
    return (
      (!includeDirectoryRegex || includeDirectoryRegex.test(absoluteName)) &&
      (!excludeRegex || !excludeRegex.test(absoluteName))
    )
  }

  return {
    files: ts.matchFiles(
      rootDir,
      extensions,
      excludes || [],
      includes,
      ts.sys.useCaseSensitiveFileNames,
      currentDir,
      depth,
      fileOrDirPath => {
        const normalizedPath = ts.getNormalizedAbsolutePath(fileOrDirPath)
        if (dirPathMatches(fileOrDirPath)) {
          directories.push(normalizedPath)
        }
        return ts.sys.getAccessibleFileSystemEntries(normalizedPath)
      },
      ts.sys.realpath
    ),
    directories,
  }
}
