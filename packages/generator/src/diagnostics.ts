import { ts } from '@ts-morph/common'

const reportDiagnostic = process.env.TEST
  ? (message: string): void => {
      const error = new Error(message)
      Error.captureStackTrace(error, reportDiagnostic)
      throw error
    }
  : console.warn

export function reportDiagnostics(
  program: ts.Program,
  verbose: boolean | undefined,
  onModuleNotFound: (specifier: string, importer: ts.SourceFile) => void
) {
  program.getGlobalDiagnostics().forEach(diagnostic => {
    reportDiagnostic(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    )
  })
  program.getOptionsDiagnostics().forEach(diagnostic => {
    reportDiagnostic(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    )
  })
  program.getConfigFileParsingDiagnostics().forEach(diagnostic => {
    reportDiagnostic(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    )
  })
  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.fileName.includes('/typescript/lib/')) {
      continue
    }
    if (!verbose && sourceFile.fileName.includes('node_modules')) {
      continue
    }
    program.getSemanticDiagnostics(sourceFile).forEach(diagnostic => {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n'
      )
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
