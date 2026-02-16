# CLI and Configuration

The `alien-rpc` CLI is used to scan your source code for route definitions and generate the manifests used by the client and server.

## Command Line Interface

```bash
npx alien-rpc [...include] [options]
```

### Arguments

- `...include`: One or more glob patterns of files to scan for `route()` definitions.

### Options

- `--root <path>`: The directory from which all other paths are relative. (Default: `./`)
- `-w, --watch`: Watch for changes and regenerate files.
- `--outDir <path>`: Base directory for generated files. (Default: `./`)
- `--serverOutFile <path>`: Path for the server manifest, relative to `outDir`. (Default: `./server/generated/api.ts`)
- `--clientOutFile <path>`: Path for the client calling code, relative to `outDir`. (Default: `./client/generated/api.ts`)
- `--tsConfigFile <path>`: Path to your `tsconfig.json`. (Default: `./tsconfig.json`)
- `--versionPrefix <version>`: A version string to prefix to all route paths (e.g., `v1`).
- `--no-format`: Disable automatic formatting of generated files.

## Configuration File

Instead of passing all options via the CLI, you can create an `alien-rpc.config.ts` (or `.js`, `.mjs`) file in your project root.

```typescript
import { defineConfig } from 'alien-rpc/config'

export default defineConfig({
  include: [
    './server/routes/**/*.ts',
    './server/auth.ts'
  ],
  outDir: './src/generated',
  serverOutFile: 'routes.ts',
  clientOutFile: 'client.ts',
  versionPrefix: 'v1'
})
```

You can also export an array of configurations if you need to generate multiple separate APIs.

```typescript
export default defineConfig([
  {
    include: ['./server/api/v1/**/*.ts'],
    outDir: './src/generated/v1',
  },
  {
    include: ['./server/api/v2/**/*.ts'],
    outDir: './src/generated/v2',
  }
])
```
