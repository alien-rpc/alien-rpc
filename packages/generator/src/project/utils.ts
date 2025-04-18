import { isFunction, pick } from 'radashi'
import type ts from 'typescript'

export type ProjectUtils = ReturnType<typeof createUtils>

export function createUtils(ts: typeof import('typescript')) {
  const inheritedPropertiesExact = [
    'flattenDiagnosticMessageText',
    'forEachChild',
    'getJSDocCommentsAndTags',
    'getTextOfJSDocComment',
    'factory',
    'SyntaxKind',
    'SymbolFlags',
    'NodeFlags',
    'TypeFlags',
    'TypeFormatFlags',
  ] as const

  const inheritedProperties = Object.keys(ts)
    .filter(key => /^is[A-Z]/.test(key))
    .concat(inheritedPropertiesExact) as Extract<
    keyof typeof ts,
    `is${string}` | (typeof inheritedPropertiesExact)[number]
  >[]

  return {
    ...pick(ts, inheritedProperties),

    isExportedNode(
      node: ts.Node & { modifiers?: readonly ts.ModifierLike[] }
    ): boolean {
      return Boolean(
        node.modifiers?.some(
          modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
        )
      )
    },

    isType(symbol: ts.Symbol): boolean {
      return Boolean(symbol.flags & ts.SymbolFlags.Type)
    },

    isTypeAlias(symbol: ts.Symbol): boolean {
      return Boolean(symbol.flags & ts.SymbolFlags.TypeAlias)
    },

    isInterfaceType(symbol: ts.Symbol): boolean {
      return Boolean(symbol.flags & ts.SymbolFlags.Interface)
    },

    isObjectLiteral(symbol: ts.Symbol): boolean {
      return Boolean(
        symbol.flags & ts.SymbolFlags.TypeLiteral ||
          symbol.flags & ts.SymbolFlags.ObjectLiteral
      )
    },

    isEnumMember(symbol: ts.Symbol): boolean {
      return Boolean(symbol.flags & ts.SymbolFlags.EnumMember)
    },

    isRegularEnum(symbol: ts.Symbol): boolean {
      return Boolean(symbol.flags & ts.SymbolFlags.RegularEnum)
    },

    isAsyncGeneratorType(type: ts.Type): type is ts.TypeReference {
      const symbol = type.getSymbol()
      return Boolean(symbol && symbol.name === 'AsyncGenerator')
    },

    isLibSymbol(symbol: ts.Symbol): boolean {
      const declarations = symbol?.getDeclarations()
      return Boolean(
        declarations?.some(declaration => {
          const fileName = declaration.getSourceFile().fileName
          return fileName.includes('/node_modules/typescript/lib/')
        })
      )
    },

    isUndefinedType(type: ts.Type): boolean {
      return Boolean(type.flags & ts.TypeFlags.Undefined)
    },

    isAnyType(type: ts.Type): boolean {
      return Boolean(type.flags & ts.TypeFlags.Any)
    },

    isNeverType(type: ts.Type): boolean {
      return Boolean(type.flags & ts.TypeFlags.Never)
    },

    isObjectType(type: ts.Type): type is ts.ObjectType {
      return Boolean(type.flags & ts.TypeFlags.Object)
    },

    isTypeReference(type: ts.Type): type is ts.TypeReference {
      return (
        this.isObjectType(type) &&
        Boolean(type.objectFlags & ts.ObjectFlags.Reference)
      )
    },

    parseTypeLiteral(type: string) {
      const sourceFile = ts.createSourceFile(
        'temp.ts',
        `type Temp = ${type}`,
        ts.ScriptTarget.Latest
      )
      return (sourceFile.statements[0] as ts.TypeAliasDeclaration).type
    },
  }
}

export function isAssignableTo(
  typeChecker: ts.TypeChecker,
  source: ts.Type | ((typeChecker: ts.TypeChecker) => ts.Type),
  target: ts.Type | ((typeChecker: ts.TypeChecker) => ts.Type)
) {
  return typeChecker.isTypeAssignableTo(
    isFunction(source) ? source(typeChecker) : source,
    isFunction(target) ? target(typeChecker) : target
  )
}

export function getArrayElementType(type: ts.Type): ts.Type {
  return (type as ts.TypeReference).typeArguments![0]
}

export function* getTupleElements(type: ts.Type): Generator<ts.Symbol> {
  for (const symbol of type.getProperties()) {
    if (symbol.escapedName === 'length') break
    yield symbol
  }
}

export function bitwiseEnumToArray(
  flags: number,
  enumValues: Record<number, string>
) {
  return Object.entries(enumValues)
    .filter(([value]) => flags & Number(value))
    .map(([_, name]) => name)
}

export function iterableToString(iterable: Iterable<string>): string {
  let result = ''
  for (const value of iterable) {
    result += value
  }
  return result
}

export function getNodeLocation(node: ts.Node) {
  const sourceFile = node.getSourceFile()
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart()
  )
  return {
    fileName: sourceFile.fileName,
    lineNumber: line + 1,
    columnNumber: character + 1,
  }
}
