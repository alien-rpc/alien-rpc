// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

export const test = route("/test").get(async (): Promise<Response> => {
  return new Response("Hello, world!");
});

/**
 * client/generated/api.ts
 */
import type { RequestOptions, Route } from "@alien-rpc/client";

export const test: Route<
  "test",
  (requestOptions?: RequestOptions) => Promise<Response>
> = { path: "test", method: "GET", arity: 1, format: "response" } as any;

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

export default [
  {
    path: "/test",
    method: "GET",
    name: "test",
    import: () => import("../../routes.js"),
    format: "response",
    requestSchema: Type.Record(Type.String(), Type.Never()),
  },
] as const;
