// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

export const getUserById = route("/users/:id").get(async (id: number) => {
  if (id === 1) {
    return { id: 1, name: "John" };
  }
  return null;
});

/**
 * client/generated/api.ts
 */
import type { RequestOptions, RequestParams, Route } from "@alien-rpc/client";

export const getUserById: Route<
  "users/:id",
  (
    params: RequestParams<{ id: number }, Record<string, never>>,
    requestOptions?: RequestOptions,
  ) => Promise<{ id: 1; name: "John" } | null>
> = {
  path: "users/:id",
  method: "GET",
  pathParams: ["id"],
  arity: 2,
  format: "json",
} as any;

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";
import { NumberParam } from "@alien-rpc/service/typebox";

export default [
  {
    path: "/users/:id",
    method: "GET",
    pathParams: ["id"],
    name: "getUserById",
    import: () => import("../../routes.js"),
    format: "json",
    pathSchema: Type.Object(
      {
        id: NumberParam(),
      },
      { additionalProperties: false },
    ),
    requestSchema: Type.Record(Type.String(), Type.Never()),
  },
] as const;
