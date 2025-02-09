import { route } from '@alien-rpc/service'

export const getBookByAuthor = route('/books/:author/:title').get(
  async ([author, title]) => {}
)
