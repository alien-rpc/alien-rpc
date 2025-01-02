import { ShallowOptions } from 'option-types'
import { isError } from 'radashi'

const kHTTPException = Symbol.for('HTTPException')

export class HTTPException {
  readonly [kHTTPException] = true
  message: string | undefined
  headers: HTTPException.Headers | undefined
  res: Response | undefined

  constructor(
    readonly status: number,
    options?: HTTPException.ResponseOptions | HTTPException.ResponseOverride
  ) {
    this.status = status
    this.message = (options as HTTPException.ResponseOptions)?.message
    this.headers = (options as HTTPException.ResponseOptions)?.headers
    this.res = (options as HTTPException.ResponseOverride)?.res
  }

  static isHTTPException(error: unknown): error is HTTPException {
    return isError(error) && error.hasOwnProperty(kHTTPException)
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/307
 */
export class TemporaryRedirectError extends HTTPException {
  name = 'TemporaryRedirectError'
  status = 307
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/308
 */
export class PermanentRedirectError extends HTTPException {
  name = 'PermanentRedirectError'
  status = 308
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400
 */
export class BadRequestError extends HTTPException {
  name = 'BadRequestError'
  constructor(
    options?: HTTPException.ResponseOptions | HTTPException.ResponseOverride
  ) {
    super(400, options)
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
 */
export class UnauthorizedError extends HTTPException {
  name = 'UnauthorizedError'
  constructor(
    options?: HTTPException.ResponseOptions | HTTPException.ResponseOverride
  ) {
    super(401, options)
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403
 */
export class ForbiddenError extends HTTPException {
  name = 'ForbiddenError'
  status = 403
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409
 */
export class ConflictError extends HTTPException {
  name = 'ConflictError'
  status = 409
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/410
 */
export class GoneError extends HTTPException {
  name = 'GoneError'
  status = 410
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/411
 */
export class LengthRequiredError extends HTTPException {
  name = 'LengthRequiredError'
  status = 411
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/412
 */
export class PreconditionFailedError extends HTTPException {
  name = 'PreconditionFailedError'
  status = 412
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/413
 */
export class PayloadTooLargeError extends HTTPException {
  name = 'PayloadTooLargeError'
  status = 413
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/415
 */
export class UnsupportedMediaTypeError extends HTTPException {
  name = 'UnsupportedMediaTypeError'
  status = 415
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/416
 */
export class RangeNotSatisfiableError extends HTTPException {
  name = 'RangeNotSatisfiableError'
  status = 416
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/417
 */
export class ExpectationFailedError extends HTTPException {
  name = 'ExpectationFailedError'
  status = 417
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/421
 */
export class MisdirectedRequestError extends HTTPException {
  name = 'MisdirectedRequestError'
  status = 421
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422
 */
export class UnprocessableContentError extends HTTPException {
  name = 'UnprocessableContentError'
  status = 422
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/428
 */
export class PreconditionRequiredError extends HTTPException {
  name = 'PreconditionRequiredError'
  status = 428
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429
 */
export class TooManyRequestsError extends HTTPException {
  name = 'TooManyRequestsError'
  status = 429
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/451
 */
export class UnavailableForLegalReasonsError extends HTTPException {
  name = 'UnavailableForLegalReasonsError'
  status = 451
}

export declare namespace HTTPException {
  export type Headers = Record<string, string> & CommonHeaders

  export type CommonHeaders = ShallowOptions<{
    /**
     * Indicates how long the client should wait before making a follow-up
     * request. Common with 429 (Too Many Requests)
     */
    'Retry-After'?: string

    /**
     * Indicates the media type of the response body. Common with 400 (Bad
     * Request) and 415 (Unsupported Media Type) to specify supported formats
     */
    'Content-Type'?: string

    /**
     * Defines the authentication method and parameters. Used with 401
     * (Unauthorized) to indicate how to authenticate properly
     */
    'WWW-Authenticate'?: string

    /**
     * Size of the response body in bytes. Used with 413 (Payload Too Large)
     * to indicate size limits
     */
    'Content-Length'?: string

    /**
     * Indicates the range of content being sent. Used with 416 (Range Not
     * Satisfiable) for failed range requests
     */
    'Content-Range'?: string

    /**
     * URL where the requested resource can be found. Common with 307/308
     * (Redirects) for resource moved
     */
    Location?: string

    /**
     * A comma-separated list of links to related resources. Common with 451
     * (Unavailable For Legal Reasons) to indicate related resources
     */
    Link?: string
  }>

  export type ResponseOptions = ShallowOptions<{
    message?: string
    headers?: Headers
  }>

  export type ResponseOverride = ShallowOptions<{
    res?: Response
  }>
}
