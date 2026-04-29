# tsc-extra

Minimal wrapper around the TypeScript compiler API for source-analysis tools.

## Installation

```sh
npm install tsc-extra typescript
```

## Minimal Use

```ts
import { createProject } from 'tsc-extra'

const project = await createProject(process.cwd())
const sourceFile = project.getSourceFileOrThrow('src/index.ts')
const checker = project.getTypeChecker()

const type = checker.getTypeAtLocation(sourceFile)
```

## Documentation

- Concepts and lifecycle: [docs/context.md](docs/context.md)
- Exact public signatures: generated `dist/index.d.ts`
- Source-owned API behavior: `src/Project.ts`, `src/TsConfigLoader.ts`, and
  `src/errors.ts`

## Public Entry Points

```ts
import {
  FileNotFoundError,
  createProject,
  createProjectFactory,
} from 'tsc-extra'
import type { Project, ProjectOptions, TsConfig } from 'tsc-extra'
```
