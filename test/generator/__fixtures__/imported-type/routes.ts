import { route } from '@alien-rpc/service'
import type { ImagePost, Post } from './post'

export const getPost = route('/posts/:id').get(async (id): Promise<Post> => {
  return {
    id,
    title: 'Hello World',
    body: 'This is a post',
    author: {
      id: '1',
      name: 'John Doe',
    },
  }
})

export const createImagePost = route('/image-posts').post(
  async ({ post }: { post: ImagePost }) => {
    console.log(post)
  }
)

// HACK: Types used explicitly in parameters or implicitly in return types
// must be manually exported or the generator will produce broken code.
export type { ImagePost }
