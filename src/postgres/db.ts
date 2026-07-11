import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "cloudflare:workers";
import * as schema from "./schema";
import * as relations from "./relations";

// A fresh pool per call: Cloudflare Workers forbid sharing I/O objects (like
// database connections) across requests.
//
// All database access goes through the Hyperdrive binding (Cloudflare's
// connection pooler). Local dev emulates it via
// CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE (.env), and tests
// via the module alias in vitest.config.ts.
const db = () => {
  const pool = new Pool({
    connectionString: env.HYPERDRIVE.connectionString,
    // Workers limit concurrent outbound connections per request; keep the
    // per-request pool small (Hyperdrive holds the real pool)
    max: 5,
    // Pools are per-call and never explicitly ended, so make abandoned pools
    // clean up after themselves: close idle sockets quickly and don't keep
    // the Node event loop (tests, tooling) alive
    idleTimeoutMillis: 1000,
    allowExitOnIdle: true,
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
