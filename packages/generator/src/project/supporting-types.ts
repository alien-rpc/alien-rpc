import path from 'node:path'
import type ts from 'typescript'
import { Project } from '../project.js'

export type SupportingTypes = ReturnType<typeof createSupportingTypes>

/**
 * Supporting types are used when generating the route definitions for
 * client and server. They help us ensure that the routes don't use any
 * unsupported types.
 */
export function createSupportingTypes(
  project: Project,
  serviceModuleId: string
) {
  const rootDir = path.dirname(project.tsConfigFilePath)
  const ts = project.utils

  const typeDeclarations = {
    AnyNonNull: '{}',
    AsyncIterable: 'AsyncIterable<any>',
    Promise: 'Promise<any>',
    Response: 'Response',
    RouteDefinition: `import("${serviceModuleId}").RouteDefinition`,
    RouteMethod: `import("${serviceModuleId}").RouteMethod`,
    RouteResult: `import("${serviceModuleId}").RouteResult`,
    RequestContext: `import("${serviceModuleId}").RequestContext`,
    Void: 'void',
    wsRouteDefinition: `import("${serviceModuleId}").ws.RouteDefinition`,
    wsRouteResult: `import("${serviceModuleId}").ws.RouteResult`,
    wsRequestContext: `import("${serviceModuleId}").ws.RequestContext`,
  } as const

  type TypeValidator = (typeChecker: ts.TypeChecker, type: ts.Type) => void

  const createMissingCheck =
    (message: string) => (typeChecker: ts.TypeChecker, type: ts.Type) => {
      if (typeChecker.isTypeAssignableTo(types.AnyNonNull(typeChecker), type)) {
        throw new Error(message)
      }
    }

  const typeValidation: Record<string, TypeValidator> = {
    AsyncIterable: createMissingCheck(
      `Could not resolve AsyncIterable type. Make sure your tsconfig has "es2018" or higher in its \`lib\` array.`
    ),
    Promise: createMissingCheck(
      `Could not resolve Promise type. Make sure your tsconfig has "es2018" or higher in its \`lib\` array.`
    ),
    Response: createMissingCheck(
      `Could not resolve Response type. Make sure @types/node is installed in your project. If already installed, it may need to be re-installed.`
    ),
  }

  const sourceFile = project.createSourceFile(
    path.join(rootDir, '.alien-rpc/support.ts'),
    Object.entries(typeDeclarations)
      .map(([id, aliasedType]) => `export type ${id}$1 = ${aliasedType}`)
      .join('\n')
  )

  type TypeGetter = (typeChecker: ts.TypeChecker) => ts.Type

  const typeCache = new Map<string, ts.Type>()

  const syntaxList = sourceFile.getChildAt(0)
  const types: {
    [TypeName in keyof typeof typeDeclarations]: TypeGetter
  } & {
    /** Reset the type cache. */
    clear(): void
  } = Object.fromEntries(
    Object.keys(typeDeclarations).map((typeName, i) => {
      const getType: TypeGetter = typeChecker => {
        let type = typeCache.get(typeName)
        if (type) {
          return type
        }

        const typeNode = syntaxList.getChildAt(i)
        if (!ts.isTypeAliasDeclaration(typeNode)) {
          throw new Error(
            `Expected "${typeName}" to be TypeAliasDeclaration, got ${ts.SyntaxKind[typeNode.kind]}`
          )
        }

        type = typeChecker.getTypeAtLocation(typeNode)
        if (typeName in typeValidation) {
          typeValidation[typeName](typeChecker, type)
        }

        typeCache.set(typeName, type)
        return type
      }

      return [typeName, getType] as const
    })
  ) as any

  types.clear = () => {
    typeCache.clear()
  }

  return types
}
