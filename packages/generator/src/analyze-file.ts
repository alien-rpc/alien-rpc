import { ts } from '@ts-morph/common'
import { AnalyzedRoute, analyzeRoute } from './analyze-route.js'
import { debug } from './debug.js'
import { SupportingTypes } from './typescript/supporting-types.js'

export type AnalyzedFile = ReturnType<typeof analyzeFile>

export function analyzeFile(
  sourceFile: ts.SourceFile,
  typeChecker: ts.TypeChecker,
  types: SupportingTypes
) {
  const routes: AnalyzedRoute[] = []
  const referencedTypes = new Map<ts.Symbol, string>()

  ts.forEachChild(sourceFile, node => {
    if (
      !ts.isVariableStatement(node) ||
      !node.modifiers ||
      node.modifiers.every(
        modifier => modifier.kind !== ts.SyntaxKind.ExportKeyword
      )
    ) {
      return
    }

    const declaration = node.declarationList.declarations[0]
    if (!ts.isVariableDeclaration(declaration)) {
      return
    }

    const symbol =
      declaration.name && typeChecker.getSymbolAtLocation(declaration.name)
    if (!symbol) {
      return
    }

    const routeName = symbol.getName()
    try {
      const route = analyzeRoute(
        sourceFile.fileName,
        routeName,
        declaration,
        typeChecker,
        types,
        referencedTypes
      )
      if (route) {
        debug('extracted route', route)
        routes.push(route)
      }
    } catch (error: any) {
      Object.assign(error, { routeName })
      throw error
    }
  })

  return { routes, referencedTypes }
}
