export type Post = {
  id: string
  title: string
  body: string
  author: import('./author').Author
}

export type Rect = [x: number, y: number, width: number, height: number]

export type ImagePost = Post & {
  image: string
  cropRect: Rect
}
