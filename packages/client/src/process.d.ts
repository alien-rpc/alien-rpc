/**
 * Bundlers replace `process.env.NODE_ENV` to support tree-shaking of
 * development-only code in libraries.
 */
declare const process: { env: { NODE_ENV: string } }
