# Alien RPC + Vite + Node.js Example

This example demonstrates a classic client-server setup using Alien RPC, with a Vite-powered frontend and a standalone Node.js backend.

## Setup

1. From the **project root**, install and build the workspace:
   ```bash
   pnpm install && pnpm build
   ```

2. From this directory, start the development server:
   ```bash
   pnpm start
   ```
   This will run `alien-rpc --watch`, `vite`, and the Node.js server (`src/node-main.ts`) concurrently.

## Project Structure

- `src/api/`: Contains your RPC route definitions.
- `src/api-server.ts`: Generated server routes.
- `src/api-client.ts`: Generated client routes.
- `src/node-main.ts`: The standalone Node.js server using `@hattip/adapter-node`.
- `index.html`: The Vite-powered frontend.

## How it works

1. The Node.js server runs on port 3001.
2. Vite runs on port 5151 and is configured to proxy `/api` requests to the Node.js server.
3. The frontend calls the API via the proxy, while the Node.js server handles the requests using the generated Alien RPC server code.
