// @ts-nocheck

/**
 * routes.ts
 */
import { route } from "@alien-rpc/service";

export const funFact = route("/fun-fact").get(() => {
  const funFacts = [
    "Bananas are berries, but strawberries aren't!",
    "A group of flamingos is called a 'flamboyance'.",
    "The shortest war in history lasted 38 minutes.",
    "Cows have best friends and get stressed when separated.",
    "The Hawaiian pizza was invented in Canada.",
  ];
  return funFacts[Math.floor(Math.random() * funFacts.length)];
});

/**
 * client/generated/api.ts
 */
import type { RequestOptions, Route } from "@alien-rpc/client";

export const funFact: Route<
  "v1/fun-fact",
  (requestOptions?: RequestOptions) => Promise<string>
> = { path: "v1/fun-fact", method: "GET", arity: 1, format: "json" } as any;

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";

export default [
  {
    path: "/v1/fun-fact",
    method: "GET",
    name: "funFact",
    import: () => import("../../routes.js"),
    format: "json",
    requestSchema: Type.Record(Type.String(), Type.Never()),
  },
] as const;
