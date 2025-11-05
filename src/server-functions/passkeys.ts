import { createServerFn } from "@tanstack/react-start";
import { db, schema } from "~/postgres/db";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { z } from "zod";
import { eq, and, count } from "drizzle-orm";

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
      algorithm: z.string(),
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
      })
      .returning();

    if (!passkey) {
      throw new Error("Failed to store passkey");
    }

    return passkey;
  });

/**
 * Delete a passkey for the authenticated user
 */
export const deletePasskeySF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(
    z.object({
      credentialId: z.string(),
    }),
  )
  .handler(async ({ data, context }) => {
    // Check total passkey count for user
    const [result] = await db()
      .select({ count: count() })
      .from(schema.passkeys)
      .where(eq(schema.passkeys.user_id, context.viewer.id));

    if (!result || result.count <= 1) {
      throw new Error("Cannot delete the last passkey");
    }

    // Delete the passkey
    const [deleted] = await db()
      .delete(schema.passkeys)
      .where(
        and(
          eq(schema.passkeys.user_id, context.viewer.id),
          eq(schema.passkeys.credential_id, data.credentialId),
        ),
      )
      .returning();

    if (!deleted) {
      throw new Error("Failed to delete passkey");
    }

    return deleted;
  });
