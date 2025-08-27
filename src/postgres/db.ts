import { drizzle } from "drizzle-orm/neon-serverless";
import { lazySingleton } from "neon-testing/utils";
import * as schema from "./schema";
import * as relations from "./relations";
import { ensureEnv } from "~/lib/env";

const db = lazySingleton(() => {
  return drizzle(ensureEnv("DATABASE_URL"), {
    casing: "snake_case",
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
