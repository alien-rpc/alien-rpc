import type ts from 'typescript'

/**
 * While traversing the type graph, this tracks which declaration symbols
 * we've already visited, so we can detect recursive types.
 */
export class SymbolStack {
  // The stack contains symbol names joined with the filename where their
  // declaration was found.
  private stack: string[] = []

  constructor(initialSymbol?: ts.Symbol) {
    if (initialSymbol) {
      this.push(initialSymbol)
    }
  }

  /**
   * Push a symbol onto the stack. This **does not** check for recursion.
   */
  push(symbol: ts.Symbol) {
    if (symbol.name !== '__type') {
      this.stack.push(identifySymbol(symbol))
      return true
    }
    return false
  }

  /**
   * Pop a symbol off the stack. Throw if it's not the top of the stack.
   */
  pop(symbol: ts.Symbol) {
    if (symbol.name !== '__type') {
      if (this.stack.at(-1) !== identifySymbol(symbol)) {
        throw new Error(
          `Expected symbol ${symbol.name} to be the top of the stack:\n${this.toString()}`
        )
      }
      this.stack.pop()
    }
  }

  includes(symbol: ts.Symbol) {
    return (
      symbol.name !== '__type' && this.stack.includes(identifySymbol(symbol))
    )
  }

  toString() {
    return '  → ' + this.stack.join('\n  → ')
  }
}

export function identifySymbol(symbol: ts.Symbol) {
  const declarations = symbol.getDeclarations()
  const declaration = declarations?.[0]
  const sourceFile = declaration?.getSourceFile()

  return symbol.name + '#' + (sourceFile?.fileName ?? 'unknown')
}
