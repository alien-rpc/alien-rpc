import type * as tscExtra from 'tsc-extra'
import type ts from 'typescript'
import { collectReferencedTypes, ReferencedTypes } from './type-references.js'
import { ProjectUtils } from './utils.js'

export const createTypePrinter = (
  project: tscExtra.Project,
  utils: ProjectUtils
) =>
  function printTypeLiteralToString(
    type: ts.Type,
    referencedTypes?: ReferencedTypes,
    symbolStack: string[] = []
  ): string {
    if (referencedTypes) {
      collectReferencedTypes(type, project as any, referencedTypes, symbolStack)
    }

    const typeChecker = project.getTypeChecker()

    if (utils.isTypeReference(type)) {
      let typeArguments = typeChecker.getTypeArguments(type)

      // Lib symbols should be preserved, instead of expanding them. But
      // their type arguments should still be expanded.
      if (utils.isLibSymbol(type.symbol)) {
        if (!typeArguments.length) {
          return type.symbol.name
        }

        // Ignore the TReturn and TNext type arguments for `AsyncIterable`
        // since the client-side ResponseStream type doesn't use them.
        if (type.symbol.name === 'AsyncIterable') {
          typeArguments = typeArguments.slice(0, 1)
        }

        const printedTypeArguments = typeArguments.map(arg => {
          return printTypeLiteralToString(arg, undefined, symbolStack)
        })
        return type.symbol.name + '<' + printedTypeArguments.join(', ') + '>'
      }

      // Preserve type constraints like `t.Format<'uuid'>`
      if (typeArguments.length > 0) {
        return typeChecker.typeToString(type)
      }
    }

    if (utils.isLibSymbol(type.symbol)) {
      return typeChecker.typeToString(type)
    }

    if (type.aliasSymbol && !symbolStack.includes(type.aliasSymbol.name)) {
      return type.aliasSymbol.name
    }

    const { TypeFormatFlags } = utils

    return typeChecker.typeToString(
      type,
      undefined,
      TypeFormatFlags.NoTruncation |
        TypeFormatFlags.InTypeAlias |
        TypeFormatFlags.UseStructuralFallback |
        TypeFormatFlags.AllowUniqueESSymbolType |
        TypeFormatFlags.WriteArrowStyleSignature |
        TypeFormatFlags.WriteTypeArgumentsOfSignature
    )
  }
