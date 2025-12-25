import type * as tscExtra from 'tsc-extra'
import type ts from 'typescript'
import type { Project } from '../project.js'
import { SymbolStack } from './symbol-stack.js'
import { collectReferencedTypes } from './type-references.js'
import type { ProjectUtils } from './utils.js'

export type ReferencedTypes = Map<ts.Symbol, string>

export const createTypePrinter = (
  project: tscExtra.Project,
  ts: ProjectUtils
) =>
  function printTypeLiteralToString(
    type: ts.Type,
    referencedTypes?: ReferencedTypes,
    symbolStack: SymbolStack = new SymbolStack()
  ): string {
    if (referencedTypes) {
      collectReferencedTypes(
        type,
        project as Project,
        referencedTypes,
        symbolStack
      )
    }

    const typeChecker = project.getTypeChecker()

    // Skip this branch for tuple types, as the getTypeArguments method
    // returns an array containing each element type, which would be a
    // false positive in this case.
    if (ts.isTypeReference(type) && !typeChecker.isTupleType(type)) {
      let typeArguments = typeChecker.getTypeArguments(type)

      // Lib symbols should be preserved, instead of expanding them. But
      // their type arguments should still be expanded.
      if (ts.isLibSymbol(type.symbol)) {
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

    if (ts.isLibSymbol(type.symbol)) {
      return typeChecker.typeToString(type)
    }

    if (type.aliasSymbol && !symbolStack.includes(type.aliasSymbol)) {
      return type.aliasSymbol.name
    }

    const { TypeFormatFlags } = ts

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
