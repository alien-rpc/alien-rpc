import { ResultFormatter } from '../types.js'

type JSON = { [key: string]: JSON | undefined } | readonly JSON[] | JSONValue
type JSONValue = string | number | boolean | null

export default {
  mapCachedResult: Promise.resolve,
  async parseResponse(promisedResponse) {
    const response = await promisedResponse
    const contentLength = response.headers.get('Content-Length')

    // Empty response equals undefined
    if (contentLength && contentLength !== '0') {
      return response.json() as Promise<JSON>
    }
  },
} satisfies ResultFormatter<Promise<JSON | undefined>>
