import type { RouteMethod, RouteResultFormat } from '@alien-rpc/route'
import { parsePathParams } from 'pathic'
import type ts from 'typescript'
import { debug } from '../debug.js'
import { Project } from '../project.js'
import { SupportingTypes } from './supporting-types.js'
import { ReferencedTypes } from './type-references.js'
import {
  getArrayElementType,
  getTupleElements,
  isAssignableTo,
} from './utils.js'

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

    // Assume the call signature takes a single variadic "args" parameter,
    // as defined in the RouteDefinition type of @alien-rpc/service.
    const [argumentsSymbol] = callSignature.parameters
    const argumentsType = typeChecker.getTypeOfSymbol(argumentsSymbol)

    for (const argumentSymbol of getTupleElements(argumentsType)) {
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

  const resolveCallSignature = (callSignature: ts.Signature) => ({
    arguments: resolveArguments(callSignature),
    resultType: resolveResultType(
      project,
      assertReturnType(callSignature),
      types,
      referencedTypes
    ),
  })

  const declarationSymbol = typeChecker.getSymbolAtLocation(declaration)!
  const declarationType = typeChecker.getTypeOfSymbol(declarationSymbol)

  if (isAssignableTo(typeChecker, declarationType, types.wsRouteHandler)) {
    const callSignature = assertCallSignature(declarationSymbol)
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
        pattern: resolveWebSocketPattern(project, returnType, types),
        argumentNames,
        argumentTypes,
        resultType: resolveResultType(
          project,
          returnType,
          types,
          referencedTypes
        ),
      },
    }
  }

  if (!isAssignableTo(typeChecker, declarationType, types.RouteDefinition)) {
    return null
  }

  const method = typeChecker.getPropertyOfType(declarationType, 'method')
  if (!method) {
    debug(`[skip] Route "${routeName}" has no "method" property`)
    return null
  }

  const path = typeChecker.getPropertyOfType(declarationType, 'path')
  if (!path) {
    debug(`[skip] Route "${routeName}" has no "path" property`)
    return null
  }

  const handler = typeChecker.getPropertyOfType(declarationType, 'handler')
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

  const callSignature = assertCallSignature(declarationSymbol)
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
      format: resolveResultFormat(project, returnType, types),
      method: parsedMethod,
      pathname: resolvedPathname,
      argumentTypes: resolvedArguments.map(arg =>
        project.printTypeLiteralToString(arg.type, referencedTypes)
      ),
      resultType: resolveResultType(
        project,
        returnType,
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

function resolveResultType(
  project: Project,
  type: ts.Type,
  types: SupportingTypes,
  referencedTypes?: Map<ts.Symbol, string>
) {
  const typeChecker = project.getTypeChecker()

  // Prevent mapping of `Response` to literal type
  if (isAssignableTo(typeChecker, type, types.Response)) {
    return 'Response'
  }

  // Coerce `void` to `undefined`
  if (isAssignableTo(typeChecker, type, types.Void)) {
    return 'undefined'
  }

  // Coerce route iterators to `AsyncIterableIterator` which is a type that
  // is supported by typebox-codegen
  if (isAssignableTo(typeChecker, type, types.RouteIterator)) {
    const yieldType = project.printTypeLiteralToString(
      (type as ts.TypeReference).typeArguments![0],
      referencedTypes
    )
    return `AsyncIterableIterator<${yieldType}>`
  }

  return project.printTypeLiteralToString(type, referencedTypes)
}

function resolveWebSocketPattern(
  project: Project,
  type: ts.Type,
  types: SupportingTypes
) {
  const typeChecker = project.getTypeChecker()
  const ts = project.utils

  if (ts.isAnyType(type)) {
    throw new InvalidResponseTypeError('Your route is not type-safe.')
  }
  if (isAssignableTo(typeChecker, type, types.Void)) {
    return 'n'
  }
  if (isAssignableTo(typeChecker, type, types.wsRouteIterableResult)) {
    return 's'
  }
  if (isAssignableTo(typeChecker, type, types.wsRouteResult)) {
    return 'r'
  }
  throw new InvalidResponseTypeError(
    'Your route returns an unsupported type: ' +
      project.printTypeLiteralToString(type)
  )
}

function resolveResultFormat(
  project: Project,
  type: ts.Type,
  types: SupportingTypes
) {
  const typeChecker = project.getTypeChecker()
  const ts = project.utils

  if (ts.isAnyType(type)) {
    throw new InvalidResponseTypeError('Your route is not type-safe.')
  }
  if (isAssignableTo(typeChecker, type, types.Response)) {
    return 'response'
  }
  if (isAssignableTo(typeChecker, type, types.RouteIterator)) {
    return 'json-seq'
  }
  if (isAssignableTo(typeChecker, type, types.Response)) {
    throw new InvalidResponseTypeError(
      'Routes that return a `new Response()` cannot ever return anything else.'
    )
  }
  if (isAssignableTo(typeChecker, type, types.RouteIterator)) {
    throw new InvalidResponseTypeError(
      'Routes that return an iterator cannot ever return anything else.'
    )
  }
  if (!isAssignableTo(typeChecker, type, types.RouteResult)) {
    throw new InvalidResponseTypeError(
      'Your route returns an unsupported type: ' +
        project.printTypeLiteralToString(type)
    )
  }
  return 'json'
}

class InvalidResponseTypeError extends Error {
  name = 'InvalidResponseTypeError'
  constructor(detail?: string) {
    super('Invalid response type' + (detail ? ': ' + detail : ''))
  }
}
