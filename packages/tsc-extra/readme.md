# tsc-extra

A minimal wrapper around TypeScript's compiler API.

```ts
import { createProject } from 'tsc-extra'

const project = await createProject(process.cwd())

// Add a source file
const sourceFile = project.createSourceFile('myFile.ts', 'const x = 5;')

// Get a source file
const sourceFile2 = project.getSourceFileOrThrow('myFile.ts')

// Remove a source file
project.removeSourceFile(sourceFile2)

// Create a program
const program = project.createProgram()

// Get the language service
const languageService = project.getLanguageService()
```

### Purpose

This package exists for static analysis of TypeScript code as well as type-checking.

It doesn't aim to help with code generation or manipulation. For that, I recommend using [ts-morph](https://ts-morph.com/), which this package pulled much of its implementation from.
