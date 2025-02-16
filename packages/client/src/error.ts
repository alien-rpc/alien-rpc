export class HTTPError extends Error {
  readonly name = 'HTTPError'
  constructor(
    readonly request: Request,
    readonly response: Response
  ) {
    super(response.statusText)
  }
}
