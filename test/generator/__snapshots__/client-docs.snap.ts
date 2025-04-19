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
import type { Route } from "@alien-rpc/client";

export default {
  /**
   * Get "foo" from the server.
   *
   * @returns "foo"
   * @see https://en.wikipedia.org/wiki/Foo_(disambiguation)
   */
  foo: { path: "foo", method: "GET", arity: 1, format: "json" } as Route<
    () => Promise<"foo">
  >,
};

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
