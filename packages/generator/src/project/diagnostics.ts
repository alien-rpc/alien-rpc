import type ts from 'typescript'
import { Project } from './project.js'

const reportDiagnostic = process.env.TEST
  ? (message: string): void => {
      const error = new Error(message)
      Error.captureStackTrace(error, reportDiagnostic)
      throw error
    }
  : console.warn

export function reportDiagnostics(
  project: Project,
  {
    verbose,
    ignoreFile,
    onModuleNotFound,
  }: {
    verbose: boolean | undefined
    ignoreFile: (file: ts.SourceFile) => boolean
    onModuleNotFound: (specifier: string, importer: ts.SourceFile) => void
  }
) {
  const program = project.getProgram()
  if (!program) {
    return
  }
  const { flattenDiagnosticMessageText } = project.utils
  program.getGlobalDiagnostics().forEach(diagnostic => {
    reportDiagnostic(flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  })
  program.getOptionsDiagnostics().forEach(diagnostic => {
    reportDiagnostic(flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  })
  program.getConfigFileParsingDiagnostics().forEach(diagnostic => {
    reportDiagnostic(flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  })
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.fileName.includes('/typescript/lib/')) {
      continue
    }
    if (!verbose && sourceFile.fileName.includes('node_modules')) {
      continue
    }
    if (ignoreFile(sourceFile)) {
      continue
    }
    program.getSemanticDiagnostics(sourceFile).forEach(diagnostic => {
      const message = flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      if (diagnostic.file) {
        const { line, character } =
          diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!)

        reportDiagnostic(
          `${message} (${diagnostic.file.fileName}:${line + 1}:${character + 1})`
        )

        const specifierMatch = message.match(/Cannot find module '(.+)'/)
        if (specifierMatch) {
          onModuleNotFound(specifierMatch[1], diagnostic.file)
        }
      } else {
        reportDiagnostic(message)
      }
    })
  }
}
