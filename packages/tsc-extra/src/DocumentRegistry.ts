import type ts from 'typescript'
import { Compiler } from './Compiler.js'

export type DocumentRegistry = ts.DocumentRegistry & {
  createOrUpdateSourceFile(
    fileName: string,
    compilationSettings: ts.CompilerOptions,
    scriptSnapshot: ts.IScriptSnapshot,
    scriptKind: ts.ScriptKind | undefined
  ): ts.SourceFile
  getSourceFile(fileName: string): ts.SourceFile | undefined
  getSourceFiles(): Iterable<ts.SourceFile>
  getSourceFilePaths(): Iterable<string>
  getSourceFileVersion(sourceFile: ts.SourceFile): string
  addSourceFile(sourceFile: ts.SourceFile): ts.SourceFile
  removeSourceFile(fileName: string): void
}

export function createDocumentRegistry(ts: Compiler): DocumentRegistry {
  const sourceFileCacheByFilePath = new Map<string, ts.SourceFile>()
  const initialVersion = '0'

  const getSourceFileVersion = (sourceFile: ts.SourceFile): string => {
    return sourceFile.version || '0'
  }

  const getNextSourceFileVersion = (sourceFile: ts.SourceFile) => {
    const currentVersion = parseInt(getSourceFileVersion(sourceFile), 10) || 0
    return (currentVersion + 1).toString()
  }

  const updateSourceFile = (
    fileName: string,
    scriptSnapshot: ts.IScriptSnapshot,
    scriptTargetOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
    version: string,
    scriptKind: ts.ScriptKind | undefined
  ): ts.SourceFile => {
    const newSourceFile = ts.createLanguageServiceSourceFile(
      fileName,
      scriptSnapshot,
      scriptTargetOrOptions,
      version,
      true,
      scriptKind
    )
    sourceFileCacheByFilePath.set(fileName, newSourceFile)
    return newSourceFile
  }

  return {
    acquireDocument(
      fileName: string,
      compilationSettings: ts.CompilerOptions,
      scriptSnapshot: ts.IScriptSnapshot,
      version: string,
      scriptKind: ts.ScriptKind | undefined
    ): ts.SourceFile {
      const standardizedFilePath = ts.getNormalizedAbsolutePath(fileName)
      let sourceFile = sourceFileCacheByFilePath.get(standardizedFilePath)
      if (sourceFile == null || getSourceFileVersion(sourceFile) !== version) {
        sourceFile = updateSourceFile(
          standardizedFilePath,
          scriptSnapshot,
          compilationSettings.target ?? ts.ScriptTarget.Latest,
          version,
          scriptKind
        )
      }
      return sourceFile
    },

    acquireDocumentWithKey(
      fileName: string,
      path: ts.Path,
      compilationSettings: ts.CompilerOptions,
      key: ts.DocumentRegistryBucketKey,
      scriptSnapshot: ts.IScriptSnapshot,
      version: string,
      scriptKind: ts.ScriptKind | undefined
    ): ts.SourceFile {
      // ignore the key because we only ever keep track of one key
      return this.acquireDocument(
        fileName,
        compilationSettings,
        scriptSnapshot,
        version,
        scriptKind
      )
    },

    createOrUpdateSourceFile(
      fileName,
      compilationSettings,
      scriptSnapshot,
      scriptKind
    ) {
      let sourceFile = sourceFileCacheByFilePath.get(fileName)
      if (sourceFile == null) {
        sourceFile = updateSourceFile(
          fileName,
          scriptSnapshot,
          compilationSettings.target ?? ts.ScriptTarget.Latest,
          initialVersion,
          scriptKind
        )
      } else {
        sourceFile = updateSourceFile(
          fileName,
          scriptSnapshot,
          compilationSettings.target ?? ts.ScriptTarget.Latest,
          getNextSourceFileVersion(sourceFile),
          scriptKind
        )
      }
      return sourceFile
    },

    getKeyForCompilationSettings() {
      return 'defaultKey' as ts.DocumentRegistryBucketKey
    },

    releaseDocument(
      fileName: string,
      compilationSettings: ts.CompilerOptions
    ) {},

    releaseDocumentWithKey(path: ts.Path, key: ts.DocumentRegistryBucketKey) {},

    removeSourceFile(fileName: string) {
      sourceFileCacheByFilePath.delete(fileName)
    },

    reportStats(): string {
      throw new Error('Not implemented')
    },

    getDocumentRegistryBucketKeyWithMode(key, mode) {
      throw new Error('Not implemented')
    },

    getBuckets() {
      throw new Error('Not implemented')
    },

    getSourceFile(fileName: string) {
      return sourceFileCacheByFilePath.get(fileName)
    },

    getSourceFilePaths() {
      return sourceFileCacheByFilePath.keys()
    },

    getSourceFiles() {
      return sourceFileCacheByFilePath.values()
    },

    getSourceFileVersion,

    addSourceFile(sourceFile: ts.SourceFile) {
      sourceFileCacheByFilePath.set(sourceFile.fileName, sourceFile)
      return sourceFile
    },

    updateDocument(
      fileName: string,
      compilationSettings: ts.CompilerOptions,
      scriptSnapshot: ts.IScriptSnapshot,
      version: string,
      scriptKind: ts.ScriptKind | undefined
    ): ts.SourceFile {
      // the compiler will call this even when it doesn't need to update for some reason
      return this.acquireDocument(
        fileName,
        compilationSettings,
        scriptSnapshot,
        version,
        scriptKind
      )
    },

    updateDocumentWithKey(
      fileName: string,
      path: ts.Path,
      compilationSettings: ts.CompilerOptions,
      key: ts.DocumentRegistryBucketKey,
      scriptSnapshot: ts.IScriptSnapshot,
      version: string,
      scriptKind: ts.ScriptKind | undefined
    ): ts.SourceFile {
      // ignore the key because we only ever keep track of one key
      return this.updateDocument(
        fileName,
        compilationSettings,
        scriptSnapshot,
        version,
        scriptKind
      )
    },
  }
}
