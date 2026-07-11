import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "#postgres/db";
import { ensureViewerMiddleware } from "#middleware/auth-middleware";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { SecureToken } from "#lib/validators";
import { deletePasskey } from "./delete-passkey";

/**
 * Store a new passkey for the authenticated user
 *
 * Accepts a client-generated id so the optimistic row keeps its identity
 * after the post-insert refetch (no delete/re-insert under a new key).
 */
export const storePasskeySF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(
    z.object({
      id: SecureToken,
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
        id: data.id,
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
 * Delete passkey server function
 *
 * The last passkey cannot be deleted. Note that users initlally have no
 * passkeys, but once they create one, they must have at least one. If they
 * loose their last passkey, they will never be able to dec.
 */
export const deletePasskeySF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .validator(z.object({ ids: SecureToken.array() }))
  .handler(async ({ data, context }) => {
    return deletePasskey(data.ids, context.viewer.id);
  });

/**
 * List passkeys
 */
export const listPasskeysSF = createServerFn({ method: "GET" })
  .middleware([ensureViewerMiddleware])
  .handler(async ({ context }) => {
    return db()
      .select()
      .from(schema.passkeys)
      .where(eq(schema.passkeys.user_id, context.viewer.id));
  });
