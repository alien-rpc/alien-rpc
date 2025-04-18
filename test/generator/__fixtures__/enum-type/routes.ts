import { route } from '@alien-rpc/service'

enum ShapeType {
  Rectangle = 'rectangle',
  Circle = 'circle',
}

export const createShape = route('/shapes').post(
  async ({ type }: { type: ShapeType }) => {
    return {
      type,
      rectangle: ShapeType.Rectangle,
      circle: ShapeType.Circle,
    }
  }
)
