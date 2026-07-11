import { db, schema } from "#postgres/db";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Delete passkey
 *
 * The last passkey cannot be deleted. Note that users initially have no
 * passkeys, but once they create one, they must have at least one. If they
 * lose their last passkey, they will never be able to decrypt their data.
 *
 * Lives in its own module (instead of alongside the server functions) so the
 * client bundle never sees it: a plain exported function is served to the
 * client as-is, and since this one touches the database, it would drag the
 * database client into the browser bundle. (Server function exports become
 * RPC stubs instead.)
 */
export function deletePasskey(
  ids: string[],
  viewerId: string,
  hooks?: { onTxBegin?: () => Promise<void> | void },
) {
  return db().transaction(async (tx) => {
    // Test hook: Synchronizes concurrent transactions to reliably expose race
    // conditions when row locking is absent
    if (hooks?.onTxBegin) {
      await hooks.onTxBegin();
    }

    if (ids.length === 0) {
      return;
    }

    // Check total passkey count for user
    const rows = await tx
      .select({ id: schema.passkeys.id })
      .from(schema.passkeys)
      .where(eq(schema.passkeys.user_id, viewerId))
      .for("update");

    // Filter out rows that are not in the ids array (eg provided IDs that do
    // not exist in the database)
    const rowsToDelete = rows.filter((row) => ids.includes(row.id));

    if (rows.length - rowsToDelete.length < 1) {
      throw new Error("Cannot delete the last passkey");
    }

    // Delete the passkey
    await tx
      .delete(schema.passkeys)
      .where(
        and(
          eq(schema.passkeys.user_id, viewerId),
          inArray(schema.passkeys.id, ids),
        ),
      );
  });
}
