// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

/**
 * Get "foo" from the server.
 *
 * @returns "foo"
 * @see https://en.wikipedia.org/wiki/Foo_(disambiguation)
 */
export const foo = route("/foo").get(() => {
  return "foo";
});

/**
 * client/generated/api.ts
 */
import type { RequestOptions, Route } from "@alien-rpc/client";

/**
 * Get "foo" from the server.
 *
 * @returns "foo"
 * @see https://en.wikipedia.org/wiki/Foo_(disambiguation)
 */
export const foo: Route<
  "foo",
  (requestOptions?: RequestOptions) => Promise<"foo">
> = { path: "foo", method: "GET", arity: 1, format: "json" } as any;

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

export default [
  {
    path: "/foo",
    method: "GET",
    name: "foo",
    import: () => import("../../routes.js"),
    format: "json",
    requestSchema: Type.Record(Type.String(), Type.Never()),
  },
] as const;
