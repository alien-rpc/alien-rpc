// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

export const voidTest = route("/void").post(async () => {});

/**
 * client/generated/api.ts
 */
import type { Route } from "@alien-rpc/client";

export default {
  voidTest: { path: "void", method: "POST", arity: 1, format: "json" } as Route<
    () => Promise<undefined>
  >,
};

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

export default [
  {
    path: "/void",
    method: "POST",
    name: "voidTest",
    import: () => import("../../routes.js"),
    format: "json",
    requestSchema: Type.Record(Type.String(), Type.Never()),
  },
] as const;
