import type ts from 'typescript'
import { Project } from '../project.js'
import { isLibSymbol, ProjectUtils } from './utils.js'

export type TypeDeclaration =
  | ts.TypeAliasDeclaration
  | ts.InterfaceDeclaration
  | ts.EnumDeclaration

export function isTypeDeclaration(
  ts: ProjectUtils,
  node: ts.Node
): node is TypeDeclaration {
  return (
    ts.isTypeAliasDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isEnumDeclaration(node)
  )
}

/**
 * When collecting referenced types, we start with the syntax tree, because
 * the type system may "flatten" union types, losing the original type
 * information.
 */
export function collectTypeDeclarations(
  ts: ProjectUtils,
  typeNode: ts.TypeNode | ts.NamedDeclaration | ts.EntityName,
  project: Project,
  onTypeDeclaration: (typeDeclaration: TypeDeclaration) => void
) {
  const typeChecker = project.getTypeChecker()
  const seen = new Set<ts.Symbol>()

  function crawlTypeNode(typeNode: ts.TypeNode) {
    // TYPE REFERENCE
    if (ts.isTypeReferenceNode(typeNode)) {
      resolveTypeName(typeNode.typeName)
      typeNode.typeArguments?.forEach(crawlTypeNode)
    }

    // UNION OR INTERSECTION TYPE
    else if (
      ts.isUnionTypeNode(typeNode) ||
      ts.isIntersectionTypeNode(typeNode)
    ) {
      typeNode.types.forEach(crawlTypeNode)
    }

    // ARRAY TYPE
    else if (ts.isArrayTypeNode(typeNode)) {
      crawlTypeNode(typeNode.elementType)
    }

    // TUPLE TYPE
    else if (ts.isTupleTypeNode(typeNode)) {
      typeNode.elements.forEach(element => {
        const elementType = ts.isNamedTupleMember(element)
          ? element.type
          : element
        crawlTypeNode(elementType)
      })
    }

    // OBJECT TYPE LITERAL
    else if (ts.isTypeLiteralNode(typeNode)) {
      crawlTypeMembers(typeNode)
    }

    // TYPE QUERY
    // else if (ts.isTypeQueryNode(typeNode)) {
    // }

    // Note: Function types are not supported.
  }

  function resolveTypeName(name: ts.EntityName) {
    let symbol = typeChecker.getSymbolAtLocation(name)
    if (!symbol) return

    // Resolve aliases to get the original symbol.
    if (symbol.flags & ts.SymbolFlags.Alias) {
      symbol = typeChecker.getAliasedSymbol(symbol)
    }

    if (seen.has(symbol)) return
    seen.add(symbol)

    const declarations = symbol.getDeclarations()
    if (!declarations) return

    // Ignore built-in symbols.
    if (isLibSymbol(declarations)) return

    const declaration = declarations[0]
    if (declaration) {
      crawlTypeDeclaration(declaration)
    }
  }

  function crawlTypeDeclaration(declaration: ts.Declaration) {
    // TYPE ALIAS
    if (ts.isTypeAliasDeclaration(declaration)) {
      crawlTypeParameters(declaration)
      crawlTypeNode(declaration.type)

      onTypeDeclaration(declaration)
    }

    // INTERFACE
    else if (ts.isInterfaceDeclaration(declaration)) {
      crawlTypeParameters(declaration)
      crawlTypeMembers(declaration)

      declaration.heritageClauses?.forEach(heritage => {
        heritage.types.forEach(crawlTypeNode)
      })

      onTypeDeclaration(declaration)
    }

    // ENUM
    else if (ts.isEnumDeclaration(declaration)) {
      onTypeDeclaration(declaration)
    }
  }

  function crawlTypeMembers(typeNode: {
    members: ts.NodeArray<ts.TypeElement>
  }) {
    typeNode.members.forEach(member => {
      if (ts.isPropertySignature(member)) {
        if (member.type) {
          crawlTypeNode(member.type)
        }
      } else if (ts.isIndexSignatureDeclaration(member)) {
        crawlTypeNode(member.type)
      }
      // Note: Method signatures are not supported.
    })
  }

  function crawlTypeParameters(typeNode: {
    typeParameters?: ts.NodeArray<ts.TypeParameterDeclaration>
  }) {
    typeNode.typeParameters?.forEach(typeParameter => {
      if (typeParameter.constraint) {
        crawlTypeNode(typeParameter.constraint)
      }
      if (typeParameter.default) {
        crawlTypeNode(typeParameter.default)
      }
    })
  }

  if (ts.isTypeNode(typeNode)) {
    crawlTypeNode(typeNode)
  } else if (ts.isDeclaration(typeNode)) {
    crawlTypeDeclaration(typeNode)
  } else {
    resolveTypeName(typeNode)
  }
}
