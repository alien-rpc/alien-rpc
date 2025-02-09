import { route } from '@alien-rpc/service'

export const voidTest = route('/void').post(async () => {})
