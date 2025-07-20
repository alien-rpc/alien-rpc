import type ts from 'typescript'
import { debug } from '../debug.js'
import { Project } from '../project.js'
import {
  AnalyzedRoute,
  analyzeRoute,
  InvalidResponseTypeError,
} from './analyze-route.js'
import { SupportingTypes } from './supporting-types.js'
import {
  collectTypeDeclarations,
  isTypeDeclaration,
  TypeDeclaration,
} from './type-nodes.js'
import { ReferencedTypes } from './type-printer.js'
import { printTypeDeclaration } from './type-references.js'

export type AnalyzedFile = ReturnType<typeof analyzeFile>

export function analyzeFile(
  project: Project,
  sourceFile: ts.SourceFile,
  types: SupportingTypes
) {
  const routes: AnalyzedRoute[] = []
  const exportedTypes: Set<TypeDeclaration> = new Set()
  const referencedTypes: ReferencedTypes = new Map()
  const warnings: string[] = []

  const typeChecker = project.getTypeChecker()
  const ts = project.utils

  const visitor = (
    node: ts.Node,
    moduleDeclaration?: ts.ModuleDeclaration
  ): void => {
    if (!ts.isExportedNode(node)) {
      return // Only consider exported declarations.
    }

    if (isTypeDeclaration(ts, node)) {
      collectTypeDeclarations(ts, node, project, exportedTypes)
    } else if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      node.exportClause.elements.forEach(specifier => {
        if (ts.isIdentifier(specifier.name)) {
          collectTypeDeclarations(ts, specifier.name, project, exportedTypes)
        }
      })
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
      if (error instanceof InvalidResponseTypeError) {
        warnings.push(`Route "${routeName}" was skipped: ${error.message}`)
      } else {
        Object.assign(error, { routeName })
        throw error
      }
    }
  }

  ts.forEachChild(sourceFile, visitor)

  for (const typeDeclaration of exportedTypes) {
    const symbol = typeDeclaration.symbol
    if (referencedTypes.has(symbol)) {
      continue
    }
    const typeString = printTypeDeclaration(
      ts,
      typeDeclaration,
      project,
      referencedTypes,
      [symbol.name]
    )
    if (typeString) {
      referencedTypes.set(symbol, typeString)
    }
  }

  return { routes, referencedTypes, warnings }
}
