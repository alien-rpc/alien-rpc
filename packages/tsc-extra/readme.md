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

This package exists for static analysis of TypeScript code as well as type-checking. Importantly, it imports the `typescript` package from the project's `node_modules` folder, ensuring what you see in your IDE is what you get when using this package.

It doesn't aim to help with code generation or manipulation. For that, I recommend using [ts-morph](https://ts-morph.com/), which this package pulled much of its implementation from.

## API Reference

### createProject

This function loads a tsconfig.json file, maintains a `ts.DocumentRegistry`, and provides a set of straight-forward utilities for getting started with the TypeScript compiler API.

- **Arguments**:
  - `rootDir`: The root directory of the project. (required)
  - `options`: An optional object with the following properties:
    - `tsConfigFile`: The path to the tsconfig.json file.
    - `compilerOptions`: The compiler options to use for the project. These override the options in the tsconfig.json file.
    - `skipAddingFilesFromTsConfig`: Whether to skip adding source files from the specified tsconfig.json.
- **Returns**: A `Project` instance.
  - `rootDir`: The root directory of the project.
  - `compilerOptions`: The compiler options used for the project.
  - `tsConfig`: The parsed tsconfig.json file.
  - `loadTsConfig`: A function to load a tsconfig.json file.
  - `addSourceFileAtPath`: A function to add a source file to the project by its file path, throwing an error if it doesn't exist.
  - `addSourceFileAtPathIfExists`: A function to add a source file to the project by its file path if it exists.
  - `createSourceFile`: A function to create a new source file in the project.
  - `getSourceFile`: A function to get a source file by its file name or path.
  - `getSourceFileOrThrow`: A function to get a source file by its file name or path, throwing an error if it doesn't exist.
  - `getSourceFiles`: A function to get all source files in the project.
  - `removeSourceFile`: A function to remove a source file from the project.
  - `resolveSourceFileDependencies`: A function to resolve the dependencies of the source files in the project.
  - `updateSourceFile`: A function to update a source file in the project.
  - `getProgram`: A function to get the current TypeScript program.
  - `createProgram`: A function to create a new TypeScript program.
  - `getLanguageService`: A function to get the TypeScript language service.
  - `getModuleResolutionHost`: A function to get the module resolution host.
  - `formatDiagnosticsWithColorAndContext`: A function to format diagnostics with color and context.

### createProjectFactory

This function wraps the `createProject` function to add additional functionality to the project.

```ts
import { createProjectFactory, ProjectOptions } from 'tsc-extra'

type Options = ProjectOptions & {
  // Add any additional options here.
}

const createProject = createProjectFactory((project, options: Options) => ({
  // Getters are copied over as getters.
  get nodeModulesDir() {
    return path.join(project.rootDir, 'node_modules')
  },
  // Anything you can define is allowed.
  anyThingYouWant() {
    // ...
  },
}))

const project = await createProject(process.cwd())

project.nodeModulesDir // => string
project.anyThingYouWant()
```
