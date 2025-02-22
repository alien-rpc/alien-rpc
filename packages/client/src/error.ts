export class HTTPError extends Error {
  readonly name = 'HTTPError'
  constructor(
    readonly request: Request,
    readonly response: Response
  ) {
    super(
      response.statusText ||
        `Server responded with ${response.status} status code`
    )
  }
}

export class NetworkError extends Error {
  readonly name = 'NetworkError'
}
