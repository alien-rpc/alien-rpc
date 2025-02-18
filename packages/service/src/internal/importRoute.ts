import type { Route } from '../types.js'
import type { ws } from '../websocket.js'

export async function importRoute<T>(route: Route | ws.Route) {
  return follow(await route.import(), route.name.split('.')) as T
}

function follow(object: any, keyPath: string[]) {
  for (const key of keyPath) {
    object = object[key]
  }
  return object
}
