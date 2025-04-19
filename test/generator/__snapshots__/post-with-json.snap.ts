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
import type { Route } from "@alien-rpc/client";

export default {
  createUser: {
    path: "users",
    method: "POST",
    arity: 2,
    format: "json",
  } as Route<
    (
      pathParams: unknown,
      searchParams: unknown,
      body: { name: string },
    ) => Promise<number>
  >,
};

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
