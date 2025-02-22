export function urlWithPathname(prefixUrl: string | URL, path: string) {
  const newUrl = new URL(prefixUrl)
  if (!newUrl.pathname.endsWith('/')) {
    newUrl.pathname += '/'
  }
  newUrl.pathname += path
  return newUrl
}
