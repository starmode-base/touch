import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { generateTxId } from "~/postgres/helpers";
import { SecureToken } from "~/lib/validators";

/**
 * Store a new passkey for the authenticated user
 */
export const storePasskeySF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(
    z.object({
      credentialId: z.string(),
      publicKey: z.string(),
      wrappedDek: z.string(),
      kekSalt: z.string(),
      transports: z.array(z.string()),
      algorithm: z.int(),
      rpName: z.string(),
      rpId: z.string(),
      webauthnUserId: z.string(),
      webauthnUserName: z.string(),
      webauthnUserDisplayName: z.string(),
    }),
  )
  .handler(async ({ data, context }) => {
    const [passkey] = await db()
      .insert(schema.passkeys)
      .values({
        user_id: context.viewer.id,
        credential_id: data.credentialId,
        public_key: data.publicKey,
        wrapped_dek: data.wrappedDek,
        kek_salt: data.kekSalt,
        transports: data.transports,
        algorithm: data.algorithm,
        rp_name: data.rpName,
        rp_id: data.rpId,
        webauthn_user_id: data.webauthnUserId,
        webauthn_user_name: data.webauthnUserName,
        webauthn_user_display_name: data.webauthnUserDisplayName,
      })
      .returning();

    if (!passkey) {
      throw new Error("Failed to store passkey");
    }

    return passkey;
  });

/**
 * Delete passkey
 *
 * The last passkey cannot be deleted. Note that users initially have no
 * passkeys, but once they create one, they must have at least one. If they lose
 * their last passkey, they will never be able to decrypt their data.
 */
export function deletePasskey(
  ids: string[],
  viewerId: string,
  hooks?: { onTxBegin?: () => Promise<void> | void },
) {
  return db().transaction(async (tx) => {
    const txid = await generateTxId(tx);

    // Test hook: Synchronizes concurrent transactions to reliably expose race
    // conditions when row locking is absent
    if (hooks?.onTxBegin) {
      await hooks.onTxBegin();
    }

    if (ids.length === 0) {
      return txid;
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

    return txid;
  });
}

/**
 * Delete passkey server function
 *
 * The last passkey cannot be deleted. Note that users initlally have no
 * passkeys, but once they create one, they must have at least one. If they
 * loose their last passkey, they will never be able to dec.
 */
export const deletePasskeySF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(z.object({ ids: SecureToken.array() }))
  .handler(async ({ data, context }) => {
    return deletePasskey(data.ids, context.viewer.id);
  });
