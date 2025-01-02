import { ShallowOptions } from 'option-types'

export type Headers = Record<string, string> &
  ShallowOptions<{
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
