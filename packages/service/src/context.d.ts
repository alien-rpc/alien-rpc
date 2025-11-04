declare module 'alien-middleware' {
  interface HattipContext<TPlatform, TEnv extends object> {
    /**
     * A byte stream for a JSON text sequence. Only exists when a route
     * handler returns an async generator.
     */
    jsonSeqStream?: JsonSeqStream
  }
}
