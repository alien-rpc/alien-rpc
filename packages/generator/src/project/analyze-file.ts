import type ts from 'typescript'
import { debug } from '../debug.js'
import { Project } from '../project.js'
import { AnalyzedRoute, analyzeRoute } from './analyze-route.js'
import { SupportingTypes } from './supporting-types.js'
import { ReferencedTypes } from './type-references.js'

export type AnalyzedFile = ReturnType<typeof analyzeFile>

export function analyzeFile(
  project: Project,
  sourceFile: ts.SourceFile,
  types: SupportingTypes
) {
  const routes: AnalyzedRoute[] = []
  const referencedTypes: ReferencedTypes = new Map()

  const typeChecker = project.getTypeChecker()
  const ts = project.utils

  ts.forEachChild(sourceFile, node => {
    if (!ts.isVariableStatement(node) || !ts.isExportedNode(node)) {
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
        project,
        sourceFile.fileName,
        routeName,
        declaration,
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
