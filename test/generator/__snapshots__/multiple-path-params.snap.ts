// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

export const getBookByAuthor = route("/books/:author/:title").get(
  async ([author, title]) => {},
);

/**
 * client/generated/api.ts
 */
import type { Route } from "@alien-rpc/client";

export default {
  getBookByAuthor: {
    path: "books/:author/:title",
    method: "GET",
    pathParams: ["author", "title"],
    arity: 2,
    format: "json",
  } as Route<
    (pathParams: { author: string; title: string }) => Promise<undefined>
  >,
};

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

export default [
  {
    path: "/books/:author/:title",
    method: "GET",
    pathParams: ["author", "title"],
    name: "getBookByAuthor",
    import: () => import("../../routes.js"),
    format: "json",
    requestSchema: Type.Record(Type.String(), Type.Never()),
  },
] as const;
