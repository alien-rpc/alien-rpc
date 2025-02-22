// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

export const voidTest = route("/void").post(async () => {});

/**
 * client/generated/api.ts
 */
import type { RequestOptions, Route } from "@alien-rpc/client";

export const voidTest: Route<
  "void",
  (requestOptions?: RequestOptions) => Promise<undefined>
> = { path: "void", method: "POST", arity: 1, format: "json" } as any;

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
