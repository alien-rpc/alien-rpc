# CLI Reference

The `alien-rpc` CLI provides a powerful code generator that creates type-safe client and server API definitions from your route files.

## Installation

The CLI is included with the main `alien-rpc` package:

```bash
npm install alien-rpc
# or
pnpm add alien-rpc
# or
yarn add alien-rpc
```

## Basic Usage

```bash
alien-rpc [include-patterns...] [options]
```

### Example

```bash
alien-rpc './server/src/routes/**/*.ts' --watch --serverOutFile ./server/src/api.ts --clientOutFile ./client/src/api.ts
```

## Command Arguments

### Include Patterns

Specify one or more glob patterns to match your route files:

```bash
# Single pattern
alien-rpc './src/routes/**/*.ts'

# Multiple patterns
alien-rpc './src/routes/**/*.ts' './src/api/**/*.ts'
```

If no patterns are provided, the CLI will look for patterns in your configuration file.

## Command Options

### Core Options

#### `--root <path>`
- **Description**: The directory from which all other paths are relative
- **Default**: `./`
- **Example**: `--root ./my-project`

#### `--outDir <path>`
- **Description**: Where to emit the generated files
- **Default**: `./`
- **Example**: `--outDir ./generated`

#### `--serverOutFile <path>`
- **Description**: Where to emit the server file, relative to outDir
- **Default**: `./server/generated/api.ts`
- **Example**: `--serverOutFile ./src/server-api.ts`

#### `--clientOutFile <path>`
- **Description**: Where to emit the client file, relative to outDir
- **Default**: `./client/generated/api.ts`
- **Example**: `--clientOutFile ./src/client-api.ts`

### Development Options

#### `-w, --watch`
- **Description**: Watch for changes and regenerate files automatically
- **Usage**: `--watch` or `-w`
- **Interactive**: When in watch mode, press `Enter` to manually trigger regeneration

#### `--verbose`
- **Description**: Print diagnostics for node_modules
- **Usage**: `--verbose`

### TypeScript Configuration

#### `--tsConfigFile <path>`
- **Description**: The path to the `tsconfig.json` file
- **Default**: `./tsconfig.json`
- **Example**: `--tsConfigFile ./tsconfig.build.json`

### API Versioning

#### `--versionPrefix <version>`
- **Description**: The current version of your API, prefixed to each route path
- **Example**: `--versionPrefix v1` (routes become `/v1/users`, `/v1/posts`, etc.)

### Formatting Options

#### `--no-format`
- **Description**: Do not format the generated files
- **Usage**: `--no-format`
- **Note**: By default, generated files are automatically formatted

### Configuration Options

#### `--no-config-file`
- **Description**: Do not load a config file
- **Usage**: `--no-config-file`
- **Note**: Useful for overriding project configuration

## Configuration File

The CLI automatically looks for configuration files in the following order:

1. `alien-rpc.config.js`
2. `alien-rpc.config.ts`
3. `alien-rpc.config.json`

### Example Configuration

```typescript
// alien-rpc.config.ts
import { defineConfig } from 'alien-rpc'

export default defineConfig({
  include: ['./src/routes/**/*.ts'],
  outDir: './generated',
  serverOutFile: './server/api.ts',
  clientOutFile: './client/api.ts',
  versionPrefix: 'v1',
  tsConfigFile: './tsconfig.json'
})
```

```json
// alien-rpc.config.json
{
  "include": ["./src/routes/**/*.ts"],
  "outDir": "./generated",
  "serverOutFile": "./server/api.ts",
  "clientOutFile": "./client/api.ts",
  "versionPrefix": "v1"
}
```

## Watch Mode

When using `--watch`, the CLI provides an interactive experience:

```bash
alien-rpc './src/routes/**/*.ts' --watch
```

### Watch Mode Features

- **Automatic Regeneration**: Files are regenerated when route files change
- **Manual Regeneration**: Press `Enter` to manually trigger regeneration
- **Real-time Feedback**: See which routes are being processed and files being written
- **Timestamps**: All log messages include timestamps for better debugging

### Watch Mode Output

```
[10:30:15] Using directory: /path/to/project
[10:30:15] Generating...
[10:30:15] Generated route: GET /users
[10:30:15] Generated route: POST /users
[10:30:15] Generated route: GET /ws (chatWebSocket)
[10:30:15] Writing file: server/generated/api.ts
[10:30:15] Writing file: client/generated/api.ts
[10:30:15] ✓ Your files are now up to date!
[10:30:15] Watching for changes...

Shortcuts:
  return → regenerate files
```

## Generated Files

### Server File

The server file contains:
- Route type definitions
- HTTP method and path mappings
- Request/response type information
- WebSocket route definitions (if any)

### Client File

The client file contains:
- Type-safe client functions for each route
- Request/response type definitions
- WebSocket client utilities (if any)
- Route path constants

## Common Workflows

### Development Workflow

```bash
# Start development with watch mode
alien-rpc './src/routes/**/*.ts' --watch --serverOutFile ./src/api.ts --clientOutFile ./client/api.ts
```

### Build Process Integration

```bash
# Generate files once for production build
alien-rpc './src/routes/**/*.ts' --serverOutFile ./dist/api.ts --clientOutFile ./client/dist/api.ts
```

### Monorepo Setup

```bash
# Generate files for different packages
alien-rpc './packages/api/src/routes/**/*.ts' \
  --root ./packages/api \
  --serverOutFile ./src/generated/api.ts \
  --clientOutFile ../../client/src/generated/api.ts
```

## Troubleshooting

### Common Issues

#### "No routes found"
- Check your include patterns match your route files
- Ensure route files export functions with proper type annotations
- Use `--verbose` to see detailed diagnostics

#### "TypeScript compilation errors"
- Verify your `tsconfig.json` path is correct
- Check that all dependencies are installed
- Ensure route files have valid TypeScript syntax

#### "Generated files not updating"
- In watch mode, try pressing `Enter` to manually regenerate
- Check file permissions in the output directories
- Verify the output paths are correct

### Debug Mode

Use `--verbose` to get detailed information about the generation process:

```bash
alien-rpc './src/routes/**/*.ts' --verbose
```

This will show:
- File resolution details
- TypeScript compilation diagnostics
- Route discovery process
- Generation timing information

## Integration Examples

### Package.json Scripts

```json
{
  "scripts": {
    "generate": "alien-rpc './src/routes/**/*.ts'",
    "generate:watch": "alien-rpc './src/routes/**/*.ts' --watch",
    "build": "npm run generate && tsc",
    "dev": "concurrently \"npm run generate:watch\" \"nodemon dist/server.js\""
  }
}
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Generate API files
  run: |
    npm install
    npx alien-rpc './src/routes/**/*.ts' --no-format
    
- name: Check for changes
  run: |
    if [ -n "$(git status --porcelain)" ]; then
      echo "Generated files are out of date"
      exit 1
    fi
```

## Advanced Usage

### Custom Output Structure

```bash
# Separate client and server generation
alien-rpc './src/routes/**/*.ts' \
  --serverOutFile ./backend/src/generated/routes.ts \
  --clientOutFile ./frontend/src/api/generated.ts \
  --versionPrefix v2
```

### Multiple API Versions

```bash
# Generate v1 API
alien-rpc './src/routes/v1/**/*.ts' \
  --versionPrefix v1 \
  --serverOutFile ./src/generated/api-v1.ts \
  --clientOutFile ./client/src/api-v1.ts

# Generate v2 API
alien-rpc './src/routes/v2/**/*.ts' \
  --versionPrefix v2 \
  --serverOutFile ./src/generated/api-v2.ts \
  --clientOutFile ./client/src/api-v2.ts
```

## Next Steps

- [Getting Started Guide](./getting-started.md) - Learn the basics
- [Defining Routes](./defining-routes.md) - Create your first routes
- [Client Usage](./client.md) - Use the generated client
- [API Reference](./api-reference.md) - Complete API documentation