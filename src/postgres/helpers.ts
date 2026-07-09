import type { PgTx } from "~/postgres/db";

export async function generateTxId(tx: PgTx): Promise<number> {
  // The ::xid cast strips off the epoch, giving you the raw 32-bit value
  // that matches what PostgreSQL sends in logical replication streams.
  const result = await tx.execute(
    `SELECT pg_current_xact_id()::xid::text as txid`,
  );
  const txid = result.rows[0]?.txid;

  if (typeof txid !== "string") {
    throw new Error(`Failed to get transaction ID`);
  }

  return parseInt(txid, 10);
}
