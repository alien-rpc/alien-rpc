import { ResponseParser } from '../types.js'

export default (r => r) satisfies ResponseParser<Promise<Response>>
