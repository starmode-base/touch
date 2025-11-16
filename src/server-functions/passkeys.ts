import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { z } from "zod";
import { eq, and, count, inArray } from "drizzle-orm";
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
 */
export const deletePasskeySF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(z.object({ ids: SecureToken.array() }))
  .handler(async ({ data, context }) => {
    return db().transaction(async (tx) => {
      const txid = await generateTxId(tx);

      // Check total passkey count for user
      const [result] = await tx
        .select({ count: count() })
        .from(schema.passkeys)
        .where(eq(schema.passkeys.user_id, context.viewer.id));

      if (result?.count === 1) {
        throw new Error("Cannot delete the last passkey");
      }

      // Delete the passkey
      await tx
        .delete(schema.passkeys)
        .where(
          and(
            eq(schema.passkeys.user_id, context.viewer.id),
            inArray(schema.passkeys.id, data.ids),
          ),
        );

      return txid;
    });
  });
