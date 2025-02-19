import { ResponseParser } from '../types.js'

type JSON = { [key: string]: JSON | undefined } | readonly JSON[] | JSONValue
type JSONValue = string | number | boolean | null

export default (async function parseResponse(promisedResponse) {
  const response = await promisedResponse

  // Empty response has no content type.
  if (response.headers.get('Content-Type') === 'application/json') {
    return response.json() as Promise<JSON>
  }
} satisfies ResponseParser<Promise<JSON | undefined>>)
