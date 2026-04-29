# @alien-rpc/generator

Programmatic generator for alien-rpc client and server manifests.

## Installation

```sh
npm install -D @alien-rpc/generator typescript @sinclair/typebox
```

## Minimal Use

```ts
import generate from '@alien-rpc/generator'

const run = generate({
  include: 'src/api/**/*.ts',
  outDir: 'src/generated',
})

await run({
  root: process.cwd(),
  watch: false,
})
```

Most applications should use the `alien-rpc` CLI. Import this package directly
when you need to embed generation into another tool.

## Documentation

- Concepts and lifecycle: [docs/context.md](docs/context.md)
- Exact public signatures: generated `dist/generator.d.ts`
- Source-owned API behavior: `src/generator.ts` and `src/generator-types.ts`

## Public Entry Points

```ts
import generate from '@alien-rpc/generator'
import type { Options } from '@alien-rpc/generator'
```
