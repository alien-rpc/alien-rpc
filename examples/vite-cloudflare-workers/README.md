# Alien RPC + Vite + Cloudflare Workers Example

This example demonstrates how to use Alien RPC with [Vite](https://vitejs.dev/) and [Cloudflare Workers](https://workers.cloudflare.com/).

## Setup

1. From the **project root**, build the workspace:
   ```bash
   pnpm build
   ```

2. Inside this directory, install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm start
   ```
   This will run `alien-rpc --watch` and `vite` concurrently. Vite is configured to use `@cloudflare/vite-plugin` for Worker support.

## Project Structure

- `src/api/`: Contains your RPC route definitions.
- `src/api-server.ts`: Generated server routes.
- `src/api-client.ts`: Generated client routes.
- `src/worker.ts`: The Cloudflare Worker entry point that handles RPC requests.
- `index.html`: A simple frontend that uses the RPC client.

## How it works

1. The `alien-rpc` CLI generates type-safe server and client glue code.
2. The Cloudflare Worker (`src/worker.ts`) handles incoming requests to `/api/*` by passing them to the Alien RPC handler.
3. The frontend uses the generated client to call the Worker-based API with full TypeScript support.
