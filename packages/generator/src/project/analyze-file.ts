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

  const visitor = (
    node: ts.Node,
    moduleDeclaration?: ts.ModuleDeclaration
  ): void => {
    if (!ts.isExportedNode(node)) {
      return // Only consider exported declarations.
    }

    if (ts.isModuleDeclaration(node) && node.body) {
      return ts.forEachChild(node.body, child => visitor(child, node))
    }

    if (!ts.isVariableStatement(node)) {
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

    let routeName = symbol.getName()
    if (moduleDeclaration) {
      routeName = `${moduleDeclaration.name.text}.${routeName}`
    }

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
  }

  ts.forEachChild(sourceFile, visitor)

  return { routes, referencedTypes }
}
