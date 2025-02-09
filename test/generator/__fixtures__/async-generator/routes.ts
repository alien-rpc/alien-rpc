import { route } from '@alien-rpc/service'

export const streamNumbers = route('/numbers').get(async function* () {
  yield 1
  yield 2
  yield 3
})
