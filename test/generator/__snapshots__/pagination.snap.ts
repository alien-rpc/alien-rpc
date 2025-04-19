// @ts-nocheck

/**
 * routes.ts
 */
import { paginate, route } from "@alien-rpc/service";

type Post = {
  id: number;
  title: string;
  content: string;
};

declare const db: {
  countPosts: () => Promise<number>;
  streamPosts: (args: {
    page: number;
    limit: number;
  }) => AsyncGenerator<Post, void, unknown>;
};

export const listPosts = route("/posts").get(async function* ({
  page = 1,
  limit = 10,
}: {
  page?: number;
  limit?: number;
}) {
  yield* db.streamPosts({ page, limit });

  const postCount = await db.countPosts();
  return paginate(this, {
    prev: page > 1 ? { page: page - 1, limit } : null,
    next:
      page < Math.ceil(postCount / limit) ? { page: page + 1, limit } : null,
  });
});

/**
 * client/generated/api.ts
 */
import type { ResponseStream, Route } from "@alien-rpc/client";
import jsonSeq from "@alien-rpc/client/formats/json-seq";

export default {
  listPosts: {
    path: "posts",
    method: "GET",
    arity: 2,
    format: jsonSeq,
  } as Route<
    (
      pathParams: unknown,
      searchParams: { page?: number | undefined; limit?: number | undefined },
    ) => ResponseStream<{ id: number; title: string; content: string }>
  >,
};

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

export default [
  {
    path: "/posts",
    method: "GET",
    name: "listPosts",
    import: () => import("../../routes.js"),
    format: "json-seq",
    requestSchema: Type.Object(
      {
        page: Type.Optional(Type.Union([Type.Number(), Type.Undefined()])),
        limit: Type.Optional(Type.Union([Type.Number(), Type.Undefined()])),
      },
      { additionalProperties: false },
    ),
  },
] as const;
