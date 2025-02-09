import { route } from '@alien-rpc/service'

export const getUserById = route('/users/:id').get(async (id: number) => {
  if (id === 1) {
    return { id: 1, name: 'John' }
  }
  return null
})
