import { Client, defineClient } from './client.js'
import { ClientOptions, ClientRoutes, ErrorMode } from './types.js'

export function defineClientFactory<
  API extends ClientRoutes,
  TDefaultErrorMode extends ErrorMode = 'reject',
>(routes: API, options: ClientOptions<TDefaultErrorMode> = {}) {
  const client = defineClient(routes, options)

  function factory(): Client<API, TDefaultErrorMode>

  function factory<TErrorMode extends ErrorMode = TDefaultErrorMode>(
    options: ClientOptions<TErrorMode>
  ): Client<API, TErrorMode>

  function factory<TErrorMode extends ErrorMode = TDefaultErrorMode>(
    options?: ClientOptions<TErrorMode>
  ): Client<API, TErrorMode> {
    return options
      ? client.extend(options)
      : (client as Client<API, TErrorMode>)
  }

  return factory
}
