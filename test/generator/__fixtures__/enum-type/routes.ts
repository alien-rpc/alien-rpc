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

// HACK: Types used explicitly in parameters or implicitly in return types
// must be manually exported or the generator will produce broken code.
export type { ShapeType, SingleMember }
