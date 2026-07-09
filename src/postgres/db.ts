import { drizzle } from "drizzle-orm/neon-serverless";
import { lazySingleton } from "neon-testing/utils";
import * as schema from "./schema";
import * as relations from "./relations";
import invariant from "tiny-invariant";

const db = lazySingleton(() => {
  const url = process.env.DATABASE_URL;
  invariant(url, "DATABASE_URL is required");
  return drizzle(url, {
    // casing: "snake_case",
    schema: { ...schema, ...relations },
  });
});

export { db, schema };

/** PG client type */
export type Db = ReturnType<typeof db>;

/** PG transactions */
export type PgTx = Parameters<Parameters<Db["transaction"]>[0]>[number];

/** PG client or transaction */
export type DbOrTx = Db | PgTx;
