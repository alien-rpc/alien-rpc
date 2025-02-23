import { getStackTrace } from './errorUtils.js'
import { Headers } from './headers.js'
import { JSONCodable } from './internal/types.js'

class TracedResponse extends Response {
  /**
   * Record a stack trace in case this response is thrown. The responder
   * will forward this trace to the client during development, so the
   * source of the response can be found.
   */
  stack =
    process.env.NODE_ENV !== 'production'
      ? getStackTrace(new Error(), 3)
      : undefined
}

/**
 * Stringify the `body` argument with `JSON.stringify` and set the
 * `Content-Type` header to `application/json`.
 */
export class JsonResponse<T extends JSONCodable> extends TracedResponse {
  constructor(
    readonly decodedBody: T,
    options?: { status?: number; headers?: Headers }
  ) {
    super(JSON.stringify(decodedBody), {
      ...options,
      headers: {
        ...options?.headers,
        'Content-Type': 'application/json',
      },
    })
  }
}

type ErrorDetails = { message: string } & Record<string, JSONCodable>

/**
 * HTTP 500 response with a JSON body
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/500
 */
export class InternalServerError extends JsonResponse<ErrorDetails> {
  constructor(error: ErrorDetails, headers?: Headers) {
    super(error, { status: 500, headers })
  }
}

/**
 * HTTP 400 response with a JSON body
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/400
 */
export class BadRequestError extends JsonResponse<ErrorDetails> {
  constructor(error: ErrorDetails, headers?: Headers) {
    super(error, { status: 400, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401
 */
export class UnauthorizedError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 401, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403
 */
export class ForbiddenError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 403, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409
 */
export class ConflictError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 409, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/410
 */
export class GoneError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 410, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/411
 */
export class LengthRequiredError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 411, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/412
 */
export class PreconditionFailedError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 412, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/413
 */
export class PayloadTooLargeError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 413, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/415
 */
export class UnsupportedMediaTypeError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 415, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/416
 */
export class RangeNotSatisfiableError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 416, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/417
 */
export class ExpectationFailedError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 417, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/421
 */
export class MisdirectedRequestError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 421, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/422
 */
export class UnprocessableContentError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 422, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/428
 */
export class PreconditionRequiredError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 428, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429
 */
export class TooManyRequestsError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 429, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/451
 */
export class UnavailableForLegalReasonsError extends TracedResponse {
  constructor(headers?: Headers) {
    super(null, { status: 451, headers })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/307
 */
export class TemporaryRedirect extends TracedResponse {
  constructor(location: string) {
    super(null, { status: 307, headers: { location } })
  }
}

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/308
 */
export class PermanentRedirect extends TracedResponse {
  constructor(location: string) {
    super(null, { status: 308, headers: { location } })
  }
}
