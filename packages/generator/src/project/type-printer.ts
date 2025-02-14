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
  ) {
    if (referencedTypes) {
      collectReferencedTypes(type, project as any, referencedTypes, symbolStack)
    }

    if (type.aliasSymbol && !symbolStack.includes(type.aliasSymbol.name)) {
      return type.aliasSymbol.name
    }

    const typeChecker = project.getTypeChecker()

    // This exists to preserve “type constraints” like `t.Format<'uuid'>`
    // but we should skip this logic for lib types like `Promise<{…}>` or
    // else we'll have issues with truncation.
    if (utils.isTypeReference(type) && !utils.isLibSymbol(type.symbol)) {
      const typeArguments = typeChecker.getTypeArguments(type)
      if (typeArguments.length > 0) {
        return typeChecker.typeToString(type)
      }
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
