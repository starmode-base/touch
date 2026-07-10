import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as relations from "./relations";
import { ensureEnv } from "~/lib/env";

/**
 * Hyperdrive binding (available in the Cloudflare Workers runtime only).
 *
 * Hyperdrive keeps a warm connection pool close to the database, so the
 * worker's per-request pg connections are cheap. In Node (tests, drizzle-kit)
 * the import fails and we fall back to connecting directly with DATABASE_URL.
 *
 * https://developers.cloudflare.com/hyperdrive/
 */
const hyperdrive = await (async () => {
  try {
    // A non-literal specifier so no bundler tries to resolve the Workers
    // builtin when building for the browser or Node
    const specifier = "cloudflare:workers";
    const { env } = (await import(
      /* @vite-ignore */ specifier
    )) as typeof import("cloudflare:workers");
    return env.HYPERDRIVE;
  } catch {
    return undefined;
  }
})();

// A fresh pool per call: Cloudflare Workers forbid sharing I/O objects (like
// database connections) across requests
const db = () => {
  const pool = new Pool({
    connectionString: hyperdrive?.connectionString ?? ensureEnv().DATABASE_URL,
    // Workers limit concurrent outbound connections per request; keep the
    // per-request pool small (Hyperdrive holds the real pool)
    max: 5,
  });

  return drizzle(pool, {
    // casing: "snake_case",
    schema: { ...schema, ...relations },
  });
};

export { db, schema };

/** PG client type */
export type Db = ReturnType<typeof db>;

/** PG transactions */
export type PgTx = Parameters<Parameters<Db["transaction"]>[0]>[number];

/** PG client or transaction */
export type DbOrTx = Db | PgTx;
