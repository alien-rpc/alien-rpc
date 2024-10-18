// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

export const complexSearch = route.get(
  "/complex",
  (
    {},
    {
      foo,
    }: {
      foo?: string | { bar?: string } | string[];
    },
  ) => {
    return foo;
  },
);

/**
 * client/api.ts
 */
import { RequestOptions, RequestParams, RpcRoute } from "@alien-rpc/client";

export const complexSearch = {
  path: "complex",
  method: "get",
  jsonParams: ["foo"],
  arity: 2,
  format: "json",
} as RpcRoute<
  "complex",
  (
    params: RequestParams<
      Record<string, never>,
      { foo?: string | string[] | { bar?: string } }
    >,
    requestOptions?: RequestOptions,
  ) => Promise<undefined | string | string[] | { bar?: undefined | string }>
>;

/**
 * server/api.ts
 */
import { Type } from "@sinclair/typebox";

export default [
  {
    path: "/complex",
    method: "get",
    jsonParams: ["foo"],
    import: async () => (await import("../routes.js")).complexSearch,
    format: "json",
    requestSchema: Type.Object({
      foo: Type.Optional(
        Type.Union([
          Type.String(),
          Type.Array(Type.String()),
          Type.Object({
            bar: Type.Optional(Type.String()),
          }),
        ]),
      ),
    }),
    responseSchema: Type.Union([
      Type.Undefined(),
      Type.String(),
      Type.Array(Type.String()),
      Type.Object({
        bar: Type.Optional(Type.Union([Type.Undefined(), Type.String()])),
      }),
    ]),
  },
] as const;