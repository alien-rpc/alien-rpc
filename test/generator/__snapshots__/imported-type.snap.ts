// @ts-nocheck

/**
 * author.ts
 */
export type Author = {
  id: string;
  name: string;
};

/**
 * post.ts
 */
export type Post = {
  id: string;
  title: string;
  body: string;
  author: import("./author").Author;
};

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";
import type { Post } from "./post";

export const getPost = route("/posts/:id").get(async (id): Promise<Post> => {
  return {
    id,
    title: "Hello World",
    body: "This is a post",
    author: {
      id: "1",
      name: "John Doe",
    },
  };
});

/**
 * client/generated/api.ts
 */
import type { Route } from "@alien-rpc/client";

export default {
  getPost: {
    path: "posts/:id",
    method: "GET",
    pathParams: ["id"],
    arity: 2,
    format: "json",
  } as Route<
    (pathParams: {
      id: string;
    }) => Promise<{
      id: string;
      title: string;
      body: string;
      author: { id: string; name: string };
    }>
  >,
};

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

export default [
  {
    path: "/posts/:id",
    method: "GET",
    pathParams: ["id"],
    name: "getPost",
    import: () => import("../../routes.js"),
    format: "json",
    requestSchema: Type.Record(Type.String(), Type.Never()),
  },
] as const;
