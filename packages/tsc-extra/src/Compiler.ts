import { resolve } from 'import-meta-resolve'
import path from 'node:path'
import type ts from 'typescript'

export type Compiler = Awaited<ReturnType<typeof getCompiler>>

export async function getCompiler(
  rootDir: string,
  overrides: {
    sys?: Partial<ts.System>
  } = {}
) {
  const resolvedCompilerPath = new URL(
    resolve('typescript', 'file://' + path.join(rootDir, 'index.js'))
  ).pathname

  const ts = (await import(resolvedCompilerPath)) as typeof import('typescript')
  const sys = { ...ts.sys, ...overrides.sys }

  return {
    ...ts,
    resolvedCompilerPath,
    getNormalizedAbsolutePath: (
      fileName: string,
      currentDirectory = sys.getCurrentDirectory()
    ) => {
      return ts.getNormalizedAbsolutePath(fileName, currentDirectory)
    },
    sys: {
      ...sys,
      getAccessibleFileSystemEntries: assertDefined(
        'ts.sys.getAccessibleFileSystemEntries',
        sys.getAccessibleFileSystemEntries
      ),
      realpath: assertDefined('ts.sys.realpath', sys.realpath),
    },
  }
}

function assertDefined<T>(name: string, method: T | undefined): T {
  if (!method) {
    throw new Error(`Expected ${name} to exist`)
  }
  return method
}
