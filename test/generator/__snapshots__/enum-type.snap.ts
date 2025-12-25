// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

enum ShapeType {
  Rectangle = "rectangle",
  Circle = "circle",
}

enum SingleMember {
  justThis,
}

export const createShape = route("/shapes").post(
  async ({ type }: { type: ShapeType; single?: SingleMember }) => {
    return {
      type,
      rectangle: ShapeType.Rectangle,
      circle: ShapeType.Circle,
    };
  },
);

// HACK: Types used explicitly in parameters or implicitly in return types
// must be manually exported or the generator will produce broken code.
export type { ShapeType, SingleMember };

/**
 * client/generated/api.ts
 */
import type { Route } from "@alien-rpc/client";

export enum ShapeType {
  Rectangle = "rectangle",
  Circle = "circle",
}
export enum SingleMember {
  justThis,
}

export default {
  createShape: {
    path: "shapes",
    method: "POST",
    arity: 2,
    format: "json",
  } as Route<
    (
      pathParams: unknown,
      searchParams: unknown,
      body: { type: ShapeType; single?: SingleMember | undefined },
    ) => Promise<{
      type: ShapeType;
      rectangle: ShapeType.Rectangle;
      circle: ShapeType.Circle;
    }>
  >,
};

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

enum EnumShapeType {
  Rectangle = "rectangle",
  Circle = "circle",
}
export const ShapeType = /* @__PURE__ */ Type.Enum(EnumShapeType);

enum EnumSingleMember {
  justThis,
}
export const SingleMember = /* @__PURE__ */ Type.Enum(EnumSingleMember);

export default [
  {
    path: "/shapes",
    method: "POST",
    name: "createShape",
    import: () => import("../../routes.js"),
    format: "json",
    requestSchema: Type.Object(
      {
        type: ShapeType,
        single: Type.Optional(Type.Union([SingleMember, Type.Undefined()])),
      },
      { additionalProperties: false },
    ),
  },
] as const;
