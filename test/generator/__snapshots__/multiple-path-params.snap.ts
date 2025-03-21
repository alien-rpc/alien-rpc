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
import type { RequestOptions, RequestParams, Route } from "@alien-rpc/client";

export const getBookByAuthor: Route<
  "books/:author/:title",
  (
    params: RequestParams<
      { author: string; title: string },
      Record<string, never>
    >,
    requestOptions?: RequestOptions,
  ) => Promise<undefined>
> = {
  path: "books/:author/:title",
  method: "GET",
  pathParams: ["author", "title"],
  arity: 2,
  format: "json",
} as any;

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
