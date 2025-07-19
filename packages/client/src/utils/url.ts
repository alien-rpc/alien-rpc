import { isString } from 'radashi'

export function urlWithPathname(prefixUrl: string | URL, path: string) {
  const newUrl = new URL(prefixUrl)
  if (!newUrl.pathname.endsWith('/')) {
    newUrl.pathname += '/'
  }
  newUrl.pathname += path
  return newUrl
}

export function resolvePrefixUrl(prefixUrl: string | URL | undefined) {
  return prefixUrl
    ? isString(prefixUrl) && prefixUrl[0] === '/'
      ? location.origin + prefixUrl
      : prefixUrl
    : location.origin
}
