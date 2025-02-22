// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

declare const db: any;

export const createUser = route("/users").post(
  async ({ name }: { name: string }) => {
    const id: number = await db.createUser({ name });
    return id;
  },
);

/**
 * client/generated/api.ts
 */
import type { RequestOptions, RequestParams, Route } from "@alien-rpc/client";

export const createUser: Route<
  "users",
  (
    params: RequestParams<Record<string, never>, { name: string }>,
    requestOptions?: RequestOptions,
  ) => Promise<number>
> = { path: "users", method: "POST", arity: 2, format: "json" } as any;

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

export default [
  {
    path: "/users",
    method: "POST",
    name: "createUser",
    import: () => import("../../routes.js"),
    format: "json",
    requestSchema: Type.Object(
      {
        name: Type.String(),
      },
      { additionalProperties: false },
    ),
  },
] as const;
