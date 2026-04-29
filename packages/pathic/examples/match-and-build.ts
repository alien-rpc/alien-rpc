import { buildPath, compilePaths, parsePathParams } from 'pathic'
import type { InferParams } from 'pathic'

const patterns = ['/users/:id', '/files/*path']
const match = compilePaths(patterns)

const matched = match('/files/docs/readme.md', (index, params) => {
  return {
    pattern: patterns[index],
    params,
  }
})

type UserParams = InferParams<'/users/:id'>

const userParams: UserParams = {
  id: '42',
}

const userPath = buildPath('/users/:id', userParams)
const pathParams = parsePathParams('/files/*path')

console.log({ matched, userPath, pathParams })
