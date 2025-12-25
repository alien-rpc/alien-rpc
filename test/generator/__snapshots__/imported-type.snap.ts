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

export type Rect = [x: number, y: number, width: number, height: number];

export type ImagePost = Post & {
  image: string;
  cropRect: Rect;
};

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";
import type { ImagePost, Post } from "./post";

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

export const createImagePost = route("/image-posts").post(
  async ({ post }: { post: ImagePost }) => {
    console.log(post);
  },
);

// HACK: Types used explicitly in parameters or implicitly in return types
// must be manually exported or the generator will produce broken code.
export type { ImagePost };

/**
 * client/generated/api.ts
 */
import type { Route } from "@alien-rpc/client";

export type Post = { id: string; title: string; body: string; author: Author };
export type Rect = [x: number, y: number, width: number, height: number];
export type ImagePost = Post & { image: string; cropRect: Rect };

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

  createImagePost: {
    path: "image-posts",
    method: "POST",
    arity: 2,
    format: "json",
  } as Route<
    (
      pathParams: unknown,
      searchParams: unknown,
      body: { post: ImagePost },
    ) => Promise<undefined>
  >,
};

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

export const Post = /* @__PURE__ */ Type.Object(
  {
    id: Type.String(),
    title: Type.String(),
    body: Type.String(),
    author: Author,
  },
  { additionalProperties: false },
);

export const Rect = /* @__PURE__ */ Type.Tuple([Type.Number(), Type.Number(), Type.Number(), Type.Number()]);

export const ImagePost = /* @__PURE__ */ Type.Composite(
  [
    Post,
    Type.Object(
      {
        image: Type.String(),
        cropRect: Rect,
      },
      { additionalProperties: false },
    ),
  ],
  { additionalProperties: false },
);

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
  {
    path: "/image-posts",
    method: "POST",
    name: "createImagePost",
    import: () => import("../../routes.js"),
    format: "json",
    requestSchema: Type.Object(
      {
        post: ImagePost,
      },
      { additionalProperties: false },
    ),
  },
] as const;
