# pathic

Small TypeScript library for matching and building URI-style path patterns.

## Installation

```sh
npm install pathic
```

## Minimal Use

```ts
import { buildPath, compilePaths, parsePathParams } from 'pathic'

const match = compilePaths(['/users/:id', '/files/*path'])

const user = match('/users/42', (index, params) => {
  return { index, id: params.id }
})

const filePath = buildPath('/files/*path', {
  path: ['docs', 'readme.md'],
})

const params = parsePathParams('/users/:id')
```

## Documentation

- Concepts and pattern rules: [docs/context.md](docs/context.md)
- Runnable example: [examples/match-and-build.ts](examples/match-and-build.ts)
- Exact public signatures: generated `dist/index.d.ts`
- Source-owned API behavior: `src/buildPath.ts`, `src/compilePaths.ts`,
  `src/parsePathParams.ts`, and `src/types.ts`

## Public Entry Points

```ts
import { buildPath, compilePaths, parsePathParams } from 'pathic'
import type {
  InferParams,
  InferParamsArray,
  PathMatcher,
  PathTemplate,
} from 'pathic'
```
