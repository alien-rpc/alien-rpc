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

export type AnalyzedRoute = {
  fileName: string
  exportedName: string
  description: string | undefined
  resolvedPathParams: string
  resolvedFormat: RouteResultFormat
  resolvedMethod: RouteMethod
  resolvedPathname: string
  resolvedArguments: string[]
  resolvedResult: string
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

  const declarationType = typeChecker.getTypeAtLocation(declaration)
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

  const handlerCallSignatures = typeChecker
    .getTypeOfSymbolAtLocation(handler, declaration)
    .getCallSignatures()

  const handlerCallSignature = handlerCallSignatures[0]

  if (handlerCallSignatures.length !== 1) {
    throw new Error('Route handler must have exactly 1 call signature')
  }

  const handlerResultType = typeChecker.getAwaitedType(
    handlerCallSignature.getReturnType()
  )
  if (!handlerResultType) {
    throw new Error('Route handler has an unknown return type')
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

  const pathParams = parsePathParams(resolvedPathname)

  let resolvedPathParams = ''
  let resolvedArguments: string[] = []

  // The handler's call signature takes a single variadic "args" parameter,
  // as defined in the RouteDefinition type of @alien-rpc/service.
  let i = 0
  for (const argument of getTupleElements(
    typeChecker.getTypeOfSymbol(handlerCallSignature.parameters[0])
  )) {
    const argumentType = typeChecker.getTypeOfSymbol(argument)
    const argumentIndex = i++

    // The request context is excluded from the resolved arguments.
    if (
      !ts.isAnyType(argumentType) &&
      isAssignableTo(typeChecker, argumentType, types.RequestContext)
    ) {
      continue
    }

    const argumentTypeLiteral = project.printTypeLiteralToString(
      argumentType,
      referencedTypes
    )

    resolvedArguments.push(argumentTypeLiteral)

    if (argumentIndex === 0 && pathParams.length > 0) {
      if (pathParams.length === 1) {
        resolvedPathParams = `{ ${pathParams[0]}: ${argumentTypeLiteral} }`
      } else if (typeChecker.isTupleType(argumentType)) {
        resolvedPathParams = `{ ${pathParams
          .map((prop, index) => {
            const propSymbol = argumentType.getProperty(String(index))
            const propType =
              propSymbol && typeChecker.getTypeOfSymbol(propSymbol)

            return `${prop}: ${propType ? project.printTypeLiteralToString(propType, referencedTypes) : 'unknown'}`
          })
          .join(', ')} }`
      } else if (typeChecker.isArrayType(argumentType)) {
        const elementType = project.printTypeLiteralToString(
          getArrayElementType(argumentType),
          referencedTypes
        )
        resolvedPathParams = `{ ${pathParams
          .map(param => {
            return `${param}: ${elementType}`
          })
          .join(', ')} }`
      }
    }
  }

  const resolvedResult = resolveResultType(
    project,
    handlerResultType,
    types,
    referencedTypes
  )

  const resolvedFormat = resolveResultFormat(project, handlerResultType, types)

  return {
    fileName,
    exportedName: routeName,
    description: extractDescription(project, declaration),
    resolvedPathParams,
    resolvedFormat,
    resolvedMethod: parsedMethod,
    resolvedPathname,
    resolvedArguments,
    resolvedResult,
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
  const ts = project.utils

  // Prevent mapping of `Response` to literal type
  if (isAssignableTo(typeChecker, type, types.Response)) {
    return 'Response'
  }

  // Coerce `void` to `undefined`
  if (isAssignableTo(typeChecker, type, types.Void)) {
    return 'undefined'
  }

  // Async generators are coerced to `AsyncIterableIterator` since
  // typebox-codegen has no Type.AsyncGenerator validator
  if (ts.isAsyncGeneratorType(type) && hasTypeArguments(type)) {
    const yieldType = project.printTypeLiteralToString(
      type.typeArguments[0],
      referencedTypes
    )
    return `AsyncIterableIterator<${yieldType}>`
  }

  return project.printTypeLiteralToString(type, referencedTypes)
}

interface TypeArguments {
  typeArguments: ts.Type[]
}

function hasTypeArguments(type: ts.Type): type is ts.Type & TypeArguments {
  return (type as ts.TypeReference).typeArguments !== undefined
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
