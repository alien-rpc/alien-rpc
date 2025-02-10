import { Route, RouteDefinition } from './types.js'

export async function importRouteDefinition(
  route: Route
): Promise<RouteDefinition> {
  const exports = await route.import()
  return exports[route.name]
}
