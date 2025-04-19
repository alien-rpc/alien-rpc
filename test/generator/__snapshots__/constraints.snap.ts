// @ts-nocheck

/**
 * routes.ts
 */
import { route, t } from "@alien-rpc/service";

export const testConstraints = route("/constraints/:id").get(
  async (
    id: string & t.Format<"uuid">,
    searchParams: {
      tuple?: [string, string];
      array?: string[] & t.MinItems<1> & t.MaxItems<2>;
      object?: Record<string, string> & t.MinProperties<1> & t.MaxProperties<2>;
      email?: string & t.Format<"email">;
      month?: string & t.Pattern<"^[0-9]{4}-(0[1-9]|1[0-2])$">;
      date?: Date & t.MinimumTimestamp<1704067200000>;
    },
  ) => {},
);

/**
 * client/generated/api.ts
 */
import type { Route } from "@alien-rpc/client";

export default {
  testConstraints: {
    path: "constraints/:id",
    method: "GET",
    pathParams: ["id"],
    arity: 2,
    format: "json",
  } as Route<
    (
      pathParams: { id: string },
      searchParams: {
        tuple?: [string, string] | undefined;
        array?: string[] | undefined;
        object?: Record<string, string> | undefined;
        email?: string | undefined;
        month?: string | undefined;
        date?: Date | undefined;
      },
    ) => Promise<undefined>
  >,
};

/**
 * server/generated/api.ts
 */
import * as Type from "@sinclair/typebox/type";
import {
  addStringFormat,
  EmailFormat,
  UuidFormat,
} from "@alien-rpc/service/formats";

addStringFormat("email", EmailFormat);
addStringFormat("uuid", UuidFormat);

export default [
  {
    path: "/constraints/:id",
    method: "GET",
    pathParams: ["id"],
    name: "testConstraints",
    import: () => import("../../routes.js"),
    format: "json",
    pathSchema: Type.Object(
      {
        id: Type.String({ format: "uuid" }),
      },
      { additionalProperties: false },
    ),
    requestSchema: Type.Object(
      {
        tuple: Type.Optional(
          Type.Union([
            Type.Tuple([Type.String(), Type.String()]),
            Type.Undefined(),
          ]),
        ),
        array: Type.Optional(
          Type.Union([
            Type.Array(Type.String(), { minItems: 1, maxItems: 2 }),
            Type.Undefined(),
          ]),
        ),
        object: Type.Optional(
          Type.Union([
            Type.Record(Type.String(), Type.String(), {
              minProperties: 1,
              maxProperties: 2,
            }),
            Type.Undefined(),
          ]),
        ),
        email: Type.Optional(
          Type.Union([Type.String({ format: "email" }), Type.Undefined()]),
        ),
        month: Type.Optional(
          Type.Union([
            Type.String({ pattern: "^[0-9]{4}-(0[1-9]|1[0-2])$" }),
            Type.Undefined(),
          ]),
        ),
        date: Type.Optional(
          Type.Union([
            Type.Date({ minimumTimestamp: 1704067200000 }),
            Type.Undefined(),
          ]),
        ),
      },
      { additionalProperties: false },
    ),
  },
] as const;
