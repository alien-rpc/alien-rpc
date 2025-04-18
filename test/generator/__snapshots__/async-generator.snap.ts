// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

export const streamNumbers = route("/numbers").get(async function* () {
  yield 1;
  yield 2;
  yield 3;
});

/**
 * client/generated/api.ts
 */
import type { ResponseStream, Route } from "@alien-rpc/client";
import jsonSeq from "@alien-rpc/client/formats/json-seq";

export default {
  streamNumbers: {
    path: "numbers",
    method: "GET",
    arity: 1,
    format: jsonSeq,
  } as Route<() => ResponseStream<1 | 2 | 3>>,
};

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

export default [
  {
    path: "/numbers",
    method: "GET",
    name: "streamNumbers",
    import: () => import("../../routes.js"),
    format: "json-seq",
    requestSchema: Type.Record(Type.String(), Type.Never()),
  },
] as const;
