import { route } from 'alien-rpc/service'

export const hello = route('/hello/:name').get(async name => {
  return { message: `Hello, ${name}!` }
})
