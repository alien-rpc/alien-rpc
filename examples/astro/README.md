# Alien RPC + Astro Example

This example demonstrates how to integrate Alien RPC with [Astro](https://astro.build/).

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
   This will run `alien-rpc --watch` and `astro dev` concurrently using `picorun`.

## Project Structure

- `src/api/`: Contains your RPC route definitions.
- `src/api-server.ts`: Generated server routes (do not edit).
- `src/api-client.ts`: Generated client routes (do not edit).
- `src/pages/api/[...all].ts`: The Astro API route that handles RPC requests. It uses a custom adapter to forward requests to the Alien RPC handler.
- `src/pages/index.astro`: Example of using the RPC client in an Astro page.

## How it works

1. The `alien-rpc` CLI watches `src/api/**/*.ts` and generates `src/api-server.ts` and `src/api-client.ts`.
2. The Astro API route in `src/pages/api/[...all].ts` uses `compileRoutes` from `@alien-rpc/service` to create a request handler.
3. The frontend (or server-side Astro code) uses `defineClient` from `@alien-rpc/client` with the generated `api-client.ts` to make type-safe calls.
