import { isNumber, sleep } from 'radashi'

export type ShouldRetryFunction = (response: Response) => number | false

export function getShouldRetry(
  request: Request,
  init?: number | RetryOptions
): ShouldRetryFunction {
  const options = castRetryOptions(init)

  if (!options.methods.includes(request.method)) {
    return () => false
  }

  let retryCount = 0

  return response => {
    if (retryCount >= options.limit) {
      return false
    }

    if (!options.statusCodes.includes(response.status)) {
      return false
    }

    if (options.afterStatusCodes.includes(response.status)) {
      const retryAfter =
        response.headers.get('Retry-After') ??
        response.headers.get('RateLimit-Reset') ??
        response.headers.get('X-RateLimit-Reset') ?? // GitHub
        response.headers.get('X-Rate-Limit-Reset') // Twitter

      if (retryAfter) {
        let delay = Number(retryAfter) * 1000
        if (Number.isNaN(delay)) {
          delay = Date.parse(retryAfter) - Date.now()
        }
        // A large number is treated as a timestamp. Use a fixed threshold
        // to protect against clock skew.
        else if (delay >= Date.parse('2025-01-01')) {
          delay -= Date.now()
        }
        if (delay > options.maxRetryAfter) {
          return false
        }
        retryCount++
        return delay
      }

      // The request body is too large, and no Retry-After header is present.
      if (response.status === 413) {
        return false
      }
    }

    return getRetryDelay(retryCount++, options)
  }
}

export type RetryOptions = {
  /**
   * The number of times to retry failed requests.
   *
   * @default 2
   */
  limit?: number

  /**
   * The HTTP methods allowed to retry.
   *
   * @default ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE']
   */
  methods?: string[]

  /**
   * The HTTP status codes allowed to retry.
   *
   * @default [408, 413, 429, 500, 502, 503, 504]
   */
  statusCodes?: number[]

  /**
   * The HTTP status codes allowed to retry with a `Retry-After` header.
   *
   * @default [413, 429, 503]
   */
  afterStatusCodes?: number[]

  /**
   * If the `Retry-After` header is greater than `maxRetryAfter`, the
   * request will be canceled.
   *
   * @default Infinity
   */
  maxRetryAfter?: number

  /**
   * The upper limit of the delay per retry in milliseconds. To clamp the
   * delay, set `backoffLimit` to 1000, for example.
   *
   * By default, the delay is calculated in the following way:
   *
   * ```
   * 0.3 * (2 ** (attemptCount - 1)) * 1000
   * ```
   *
   * The delay increases exponentially.
   *
   * @default Infinity
   */
  backoffLimit?: number

  /**
   * A function to calculate the delay between retries given `attemptCount`
   * (starts from 1).
   *
   * @default attemptCount => 0.3 * (2 ** (attemptCount - 1)) * 1000
   */
  delay?: (attemptCount: number) => number
}

const defaultRetryMethods = ['GET', 'PUT', 'HEAD', 'DELETE', 'OPTIONS', 'TRACE']
const defaultRetryStatusCodes = [408, 413, 429, 500, 502, 503, 504]
const defaultRetryAfterStatusCodes = [413, 429, 503]
const defaultRetryDelay = (attemptCount: number) =>
  0.3 * 2 ** (attemptCount - 1) * 1000

function castRetryOptions(
  options?: number | RetryOptions
): Required<RetryOptions> {
  let limit: number
  if (isNumber(options)) {
    limit = options
    options = undefined
  } else {
    limit = options?.limit ?? 2
  }
  return {
    statusCodes: defaultRetryStatusCodes,
    afterStatusCodes: defaultRetryAfterStatusCodes,
    maxRetryAfter: Number.POSITIVE_INFINITY,
    backoffLimit: Number.POSITIVE_INFINITY,
    delay: defaultRetryDelay,
    ...options,
    limit,
    methods:
      options?.methods?.map(method => method.toUpperCase()) ??
      defaultRetryMethods,
  }
}

function getRetryDelay(retryCount: number, options: Required<RetryOptions>) {
  return Math.min(options.backoffLimit, options.delay(retryCount))
}

export function mergeRetryOptions(
  parentOptions?: RetryOptions | number | undefined,
  options?: RetryOptions | number | undefined
): RetryOptions | number | undefined {
  if (options !== undefined && parentOptions !== undefined) {
    if (isNumber(options)) {
      options = { limit: options }
    }
    if (isNumber(parentOptions)) {
      parentOptions = { limit: parentOptions }
    }
    return { ...parentOptions, ...options }
  }
  return options ?? parentOptions
}

export async function withRetry<TFunc extends () => any>(
  init: RetryOptions | number | undefined,
  func: TFunc,
  signal?: AbortSignal
) {
  const options = castRetryOptions(init)
  let retryCount = 0
  while (true) {
    signal?.throwIfAborted()
    try {
      return await func()
    } catch (error) {
      if (retryCount >= options.limit) {
        throw error
      }
      signal?.throwIfAborted()
      await sleep(getRetryDelay(retryCount++, options))
    }
  }
}
