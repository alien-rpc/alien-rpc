import type { RouteMethod, RouteResultFormat } from '@alien-rpc/route'
import { parsePathParams } from 'pathic'
import type ts from 'typescript'
import { debug } from '../debug.js'
import { Project } from '../project.js'
import { SupportingTypes } from './supporting-types.js'
import { ReferencedTypes } from './type-references.js'
import { getArrayElementType, isAssignableTo } from './utils.js'

export type ResolvedHttpRoute = {
  protocol: 'http'
  pathParams: string
  format: RouteResultFormat
  method: RouteMethod
  pathname: string
  argumentTypes: string[]
  resultType: string
}

export type ResolvedWsRoute = {
  protocol: 'ws'
  pattern: 'n' | 'r' | 's'
  argumentNames: string[]
  argumentTypes: string[]
  resultType: string
}

export type AnalyzedRoute = {
  name: string
  description: string | undefined
  fileName: string
  resolvedHttpRoute?: ResolvedHttpRoute | undefined
  resolvedWsRoute?: ResolvedWsRoute | undefined
}

export function analyzeRoute(
  project: Project,
  fileName: string,
  routeName: string,
  declaration: ts.VariableDeclaration,
  types: SupportingTypes,
  referencedTypes: ReferencedTypes
): AnalyzedRoute | null {
  debug(`Analyzing route "${routeName}"`)

  const typeChecker = project.getTypeChecker()
  const ts = project.utils

  const assertReturnType = (callSignature: ts.Signature) => {
    const returnType = typeChecker.getAwaitedType(callSignature.getReturnType())
    if (!returnType) {
      throw new Error('Route handler has an unknown return type')
    }
    return returnType
  }

  const assertCallSignature = (handler: ts.Symbol) => {
    const callSignatures = typeChecker
      .getTypeOfSymbolAtLocation(handler, declaration)
      .getCallSignatures()

    if (callSignatures.length !== 1) {
      throw new Error('Route handler must have exactly 1 call signature')
    }

    return callSignatures[0]
  }

  const resolveArguments = (callSignature: ts.Signature) => {
    const resolvedArguments: { name: string; type: ts.Type }[] = []

    const [argumentSymbols] = typeChecker.getExpandedParameters(callSignature)
    for (const argumentSymbol of argumentSymbols) {
      const argumentType = typeChecker.getTypeOfSymbol(argumentSymbol)

      // The request context is excluded from the resolved arguments.
      if (
        !ts.isAnyType(argumentType) &&
        (isAssignableTo(typeChecker, argumentType, types.RequestContext) ||
          isAssignableTo(typeChecker, argumentType, types.wsRequestContext))
      ) {
        continue
      }

      resolvedArguments.push({
        name: argumentSymbol.name,
        type: argumentType,
      })
    }

    return resolvedArguments
  }

  const routeSymbol = typeChecker.getSymbolAtLocation(declaration.name)!
  const routeType = typeChecker.getTypeOfSymbol(routeSymbol)

  if (isAssignableTo(typeChecker, routeType, types.wsRouteDefinition)) {
    const handler = typeChecker.getPropertyOfType(routeType, 'handler')
    if (!handler) {
      debug(`[skip] Route "${routeName}" has no "handler" property`)
      return null
    }

    const callSignature = assertCallSignature(handler)
    const returnType = assertReturnType(callSignature)

    const resolvedArguments = resolveArguments(callSignature)
    const argumentNames = resolvedArguments.map(arg => arg.name)
    const argumentTypes = resolvedArguments.map(arg =>
      project.printTypeLiteralToString(arg.type, referencedTypes)
    )

    return {
      name: routeName,
      description: extractDescription(project, declaration),
      fileName,
      resolvedWsRoute: {
        protocol: 'ws',
        pattern: resolveWebSocketPattern(
          project,
          declaration,
          returnType,
          types
        ),
        argumentNames,
        argumentTypes,
        resultType: resolveClientResultType(
          project,
          typeChecker.getTypeOfPropertyOfType(routeType, '__clientResult'),
          types,
          referencedTypes
        ),
      },
    }
  }

  if (!isAssignableTo(typeChecker, routeType, types.RouteDefinition)) {
    return null
  }

  const method = typeChecker.getPropertyOfType(routeType, 'method')
  if (!method) {
    debug(`[skip] Route "${routeName}" has no "method" property`)
    return null
  }

  const path = typeChecker.getPropertyOfType(routeType, 'path')
  if (!path) {
    debug(`[skip] Route "${routeName}" has no "path" property`)
    return null
  }

  const handler = typeChecker.getPropertyOfType(routeType, 'handler')
  if (!handler) {
    debug(`[skip] Route "${routeName}" has no "handler" property`)
    return null
  }

  if (
    !typeChecker.isTypeAssignableTo(
      typeChecker.getTypeOfSymbol(method),
      types.RouteMethod(typeChecker)
    )
  ) {
    throw new Error(
      `Route has an unsupported HTTP method: ${typeChecker.typeToString(typeChecker.getTypeOfSymbol(method))}`
    )
  }

  if (
    !typeChecker.isTypeAssignableTo(
      typeChecker.getTypeOfSymbol(path),
      typeChecker.getStringType()
    )
  ) {
    throw new Error(`Route path is not a string`)
  }

  const resolvedMethod = project.printTypeLiteralToString(
    typeChecker.getTypeOfSymbol(method)
  )

  let parsedMethod: RouteMethod
  try {
    parsedMethod = JSON.parse(resolvedMethod) as RouteMethod
  } catch {
    throw new Error(
      `Route must have a string literal for its "method" property.`
    )
  }

  let resolvedPathname = project.printTypeLiteralToString(
    typeChecker.getTypeOfSymbol(path)
  )

  try {
    resolvedPathname = JSON.parse(resolvedPathname) as string
  } catch {
    throw new Error(`Route must have a string literal for its "path" property.`)
  }

  const callSignature = assertCallSignature(handler)
  const returnType = assertReturnType(callSignature)
  const resolvedArguments = resolveArguments(callSignature)
  const pathParams = parsePathParams(resolvedPathname)

  let resolvedPathParams = ''
  if (pathParams.length > 0 && resolvedArguments.length > 0) {
    const { type } = resolvedArguments[0]
    if (pathParams.length === 1) {
      resolvedPathParams = `{ ${pathParams[0]}: ${project.printTypeLiteralToString(type, referencedTypes)} }`
    } else if (typeChecker.isTupleType(type)) {
      resolvedPathParams = `{ ${pathParams
        .map((prop, index) => {
          const propSymbol = type.getProperty(String(index))
          const propType = propSymbol && typeChecker.getTypeOfSymbol(propSymbol)

          return `${prop}: ${propType ? project.printTypeLiteralToString(propType, referencedTypes) : 'unknown'}`
        })
        .join(', ')} }`
    } else if (typeChecker.isArrayType(type)) {
      const elementType = project.printTypeLiteralToString(
        getArrayElementType(type),
        referencedTypes
      )
      resolvedPathParams = `{ ${pathParams
        .map(param => {
          return `${param}: ${elementType}`
        })
        .join(', ')} }`
    }
  }

  return {
    fileName,
    name: routeName,
    description: extractDescription(project, declaration),
    resolvedHttpRoute: {
      protocol: 'http',
      pathParams: resolvedPathParams,
      format: resolveResultFormat(project, declaration, returnType, types),
      method: parsedMethod,
      pathname: resolvedPathname,
      argumentTypes: resolvedArguments.map(arg =>
        project.printTypeLiteralToString(arg.type, referencedTypes)
      ),
      resultType: resolveClientResultType(
        project,
        typeChecker.getTypeOfPropertyOfType(routeType, '__clientResult'),
        types,
        referencedTypes
      ),
    },
  }
}

function extractDescription(
  project: Project,
  declaration: ts.VariableDeclaration
) {
  const ts = project.utils
  const docs = ts.getJSDocCommentsAndTags(declaration)
  if (docs.length > 0) {
    return docs
      .map(doc => {
        let text = ts.getTextOfJSDocComment(doc.comment) ?? ''
        if ('tags' in doc && doc.tags) {
          if (text) {
            text += '\n'
          }
          doc.tags.forEach(tag => {
            const tagText = ts.getTextOfJSDocComment(tag.comment)
            text +=
              (text ? '\n' : '') +
              '@' +
              tag.tagName.text +
              (tagText
                ? ' ' +
                  (ts.isJSDocSeeTag(tag) && tag.name
                    ? (tag.name.name as ts.Identifier).text
                    : '') +
                  tagText
                : '')
          })
        }
        return text
      })
      .join('\n')
  }
}

function resolveClientResultType(
  project: Project,
  type: ts.Type | undefined,
  types: SupportingTypes,
  referencedTypes?: Map<ts.Symbol, string>
): string {
  const typeChecker = project.getTypeChecker()
  const ts = project.utils

  if (!type || ts.isAnyType(type)) {
    return 'any'
  }

  // Coerce `void` to `undefined`
  if (isAssignableTo(typeChecker, type, types.Void)) {
    return 'undefined'
  }

  // Coerce response-like objects to `Response`
  if (isAssignableTo(typeChecker, type, types.Response)) {
    return 'Response'
  }

  // Coerce async iterables to `ResponseStream`
  if (isAssignableTo(typeChecker, type, types.AsyncIterable)) {
    const [yieldType] = typeChecker.getTypeArguments(type as ts.TypeReference)

    // This will be wrapped with either the ResponseStream or
    // ReadableStream type at a later stage.
    return resolveClientResultType(project, yieldType, types, referencedTypes)
  }

  return project.printTypeLiteralToString(type, referencedTypes)
}

function resolveWebSocketPattern(
  project: Project,
  declaration: ts.VariableDeclaration,
  type: ts.Type,
  types: SupportingTypes
) {
  const typeChecker = project.getTypeChecker()
  const ts = project.utils

  if (ts.isAnyType(type)) {
    throw new InvalidResponseTypeError(
      'Your route is not type-safe.',
      declaration
    )
  }
  if (isAssignableTo(typeChecker, type, types.Promise)) {
    const awaitedType =
      typeChecker.getAwaitedType(type) ?? typeChecker.getAnyType()

    return resolveWebSocketPattern(project, declaration, awaitedType, types)
  }
  if (isAssignableTo(typeChecker, type, types.Void)) {
    return 'n'
  }
  if (isAssignableTo(typeChecker, type, types.AsyncIterable)) {
    return 's'
  }
  if (isAssignableTo(typeChecker, type, types.wsRouteResult)) {
    return 'r'
  }
  throw new InvalidResponseTypeError(
    'Your route returns an unsupported type: ' +
      project.printTypeLiteralToString(type),
    declaration
  )
}

function resolveResultFormat(
  project: Project,
  declaration: ts.VariableDeclaration,
  type: ts.Type,
  types: SupportingTypes
) {
  const typeChecker = project.getTypeChecker()
  const ts = project.utils

  if (ts.isAnyType(type)) {
    throw new InvalidResponseTypeError(
      'Your route is not type-safe.',
      declaration
    )
  }
  // Prevent infinite recursion.
  if (ts.isNeverType(type)) {
    return 'json'
  }
  if (isAssignableTo(typeChecker, type, types.Promise)) {
    const awaitedType =
      typeChecker.getAwaitedType(type) ?? typeChecker.getAnyType()

    return resolveResultFormat(project, declaration, awaitedType, types)
  }
  if (isAssignableTo(typeChecker, type, types.Response)) {
    return 'response'
  }
  if (isAssignableTo(typeChecker, type, types.AsyncIterable)) {
    return 'json-seq'
  }
  if (isAssignableTo(typeChecker, types.Response, type)) {
    throw new InvalidResponseTypeError(
      'Routes that return a `new Response()` cannot ever return anything else.',
      declaration
    )
  }
  if (isAssignableTo(typeChecker, types.AsyncIterable, type)) {
    throw new InvalidResponseTypeError(
      'Routes that return an iterator cannot ever return anything else.',
      declaration
    )
  }
  if (!isAssignableTo(typeChecker, type, types.RouteResult)) {
    throw new InvalidResponseTypeError(
      'Your route returns an unsupported type: ' +
        project.printTypeLiteralToString(type),
      declaration
    )
  }
  return 'json'
}

export class InvalidResponseTypeError extends Error {
  name = 'InvalidResponseTypeError'
  constructor(detail: string, declaration: ts.VariableDeclaration) {
    const sourceFile = declaration.getSourceFile()
    const start = sourceFile.getLineAndCharacterOfPosition(
      declaration.name.getStart()
    )
    super(
      'Invalid response type: ' +
        detail +
        ` (${sourceFile.fileName}:${start.line + 1}:${start.character + 1})`
    )
  }
}
