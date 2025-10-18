import { assert, isString } from 'radashi'

export function urlWithPathname(prefixUrl: string | URL, path: string) {
  const newUrl = new URL(prefixUrl)
  if (!newUrl.pathname.endsWith('/')) {
    newUrl.pathname += '/'
  }
  newUrl.pathname += path
  return newUrl
}

export function resolvePrefixUrl(prefixUrl: string | URL | undefined) {
  if (typeof location === 'undefined') {
    assert(prefixUrl, 'prefixUrl is required when location is undefined')
    if (isString(prefixUrl)) {
      assert(URL.canParse(prefixUrl), 'prefixUrl must be a valid URL')
    }
    return prefixUrl
  }
  return prefixUrl
    ? isString(prefixUrl) && prefixUrl[0] === '/'
      ? location.origin + prefixUrl
      : prefixUrl
    : location.origin
}
