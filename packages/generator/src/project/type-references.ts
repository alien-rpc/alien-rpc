import type ts from 'typescript'
import { Project } from '../project.js'
import { getArrayElementType, getTupleElements } from './utils.js'

const typeConstraintFileRegex = /\/@?alien-rpc\/.+?\/constraint\.d\.ts$/

export type ReferencedTypes = Map<ts.Symbol, string>

export function collectReferencedTypes(
  type: ts.Type,
  project: Project,
  referencedTypes: ReferencedTypes,
  symbolStack: string[]
) {
  const ts = project.utils
  const typeChecker = project.getTypeChecker()

  collect(type)

  function collect(type: ts.Type) {
    const instanceSymbol = type.aliasSymbol ?? type.symbol

    const declarations = instanceSymbol?.getDeclarations()
    const declaration = declarations?.[0]

    // Skip type constraints.
    const declarationFile = declaration?.getSourceFile()
    if (typeConstraintFileRegex.test(declarationFile?.fileName ?? '')) {
      return
    }

    const referencedSymbol = declaration && getDeclarationSymbol(declaration)

    const recursive = !(
      (instanceSymbol && symbolStack.includes(instanceSymbol.name)) ||
      (referencedSymbol && symbolStack.includes(referencedSymbol.name))
    )

    if (recursive) {
      const ts = project.utils

      const symbol = referencedSymbol ?? instanceSymbol
      const pushed = pushSymbol(symbolStack, symbol)

      for (const nestedType of visitNestedTypes(type)) {
        collect(nestedType)
      }

      if (
        symbol &&
        symbol === referencedSymbol &&
        ts.isType(symbol) &&
        !ts.isLibSymbol(symbol) &&
        !ts.isEnumMember(symbol) &&
        !referencedTypes.has(symbol)
      ) {
        let typeString: string
        if (ts.isRegularEnum(symbol)) {
          typeString = 'export ' + declaration!.getText()
        } else {
          typeString = `export type ${symbol.name} = `
          if (ts.isInterfaceType(symbol)) {
            typeString += '{\n'
            for (const propertySymbol of (
              type as ts.InterfaceType
            ).getProperties()) {
              // Prefer using a type node if available, as it could have an
              // aliasSymbol attached, which must be collected as a type
              // reference.
              const propertyTypeNode =
                propertySymbol.valueDeclaration &&
                ts.isPropertySignature(propertySymbol.valueDeclaration)
                  ? propertySymbol.valueDeclaration
                  : undefined

              const propertyType = propertyTypeNode?.type
                ? typeChecker.getTypeFromTypeNode(propertyTypeNode.type)
                : typeChecker.getTypeOfSymbol(propertySymbol)

              typeString +=
                '  ' +
                propertySymbol.name +
                (propertyTypeNode?.questionToken ? '?' : '') +
                ': ' +
                project.printTypeLiteralToString(
                  propertyType,
                  referencedTypes,
                  symbolStack
                ) +
                '\n'
            }
            typeString += '}'
          } else {
            typeString += project.printTypeLiteralToString(
              type,
              referencedTypes,
              symbolStack
            )
          }
        }

        referencedTypes.set(symbol, typeString)
      }

      if (pushed) {
        symbolStack.pop()
      }
    }
  }

  function* visitNestedTypes(type: ts.Type) {
    if (type.isUnion()) {
      yield* type.types
    } else if (type.isIntersection()) {
      yield* type.types
    } else if (typeChecker.isTupleType(type)) {
      for (const elementSymbol of getTupleElements(type)) {
        yield typeChecker.getTypeOfSymbol(elementSymbol)
      }
    } else if (typeChecker.isArrayType(type)) {
      yield getArrayElementType(type)
    } else {
      const callSignatures = type.getCallSignatures()
      if (callSignatures.length > 0) {
        for (const signature of callSignatures) {
          for (const parameter of signature.getParameters()) {
            yield typeChecker.getTypeOfSymbol(parameter)
          }
          yield typeChecker.getReturnTypeOfSignature(signature)
        }
      } else {
        const symbol = type.aliasSymbol ?? type.symbol

        if (ts.isTypeReference(type)) {
          for (const typeArgument of typeChecker.getTypeArguments(type)) {
            yield typeArgument
          }
        }

        if (symbol && !ts.isLibSymbol(symbol) && ts.isObjectType(type)) {
          for (const propertySymbol of typeChecker.getPropertiesOfType(type)) {
            yield typeChecker.getTypeOfSymbol(propertySymbol)
          }
          const stringIndexType = type.getStringIndexType()
          if (stringIndexType) {
            yield stringIndexType
          }
          const numberIndexType = type.getNumberIndexType()
          if (numberIndexType) {
            yield numberIndexType
          }
        }
      }
    }
  }

  function getDeclarationSymbol(decl: ts.Declaration) {
    const id = ts.isInterfaceDeclaration(decl)
      ? decl.name
      : decl.forEachChild(child => (ts.isIdentifier(child) ? child : undefined))

    return id && typeChecker.getSymbolAtLocation(id)
  }

  function pushSymbol(symbolStack: string[], symbol: ts.Symbol | undefined) {
    if (symbol && symbol.name !== '__type') {
      symbolStack.push(symbol.name)
      return true
    }
    return false
  }
}
