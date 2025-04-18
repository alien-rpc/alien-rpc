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

export const createShape: Route<
  (
    pathParams: unknown,
    searchParams: unknown,
    body: { type: ShapeType; single?: SingleMember | undefined },
  ) => Promise<{
    type: ShapeType;
    rectangle: ShapeType.Rectangle;
    circle: ShapeType.Circle;
  }>
> = { path: "shapes", method: "POST", arity: 2, format: "json" } as any;

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

enum EnumShapeType {
  Rectangle = "rectangle",
  Circle = "circle",
}
export const ShapeType = Type.Enum(EnumShapeType);

enum EnumSingleMember {
  justThis,
}
export const SingleMember = Type.Enum(EnumSingleMember);

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
