import { route } from '@alien-rpc/service'

enum ShapeType {
  Rectangle = 'rectangle',
  Circle = 'circle',
}

enum SingleMember {
  justThis,
}

export const createShape = route('/shapes').post(
  async ({ type }: { type: ShapeType; single?: SingleMember }) => {
    return {
      type,
      rectangle: ShapeType.Rectangle,
      circle: ShapeType.Circle,
    }
  }
)
