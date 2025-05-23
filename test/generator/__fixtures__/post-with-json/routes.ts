import { route } from '@alien-rpc/service'

declare const db: any

export const createUser = route('/users').post(
  async ({ name }: { name: string }) => {
    const id: number = await db.createUser({ name })
    return id
  }
)
