import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db, schema } from "~/postgres/db";
import { ensureViewerMiddleware } from "~/middleware/auth-middleware";
import { z } from "zod";

const storePasskeyInputSchema = z.object({
  credentialId: z.string(),
  publicKey: z.string(),
  wrappedDek: z.string(),
  kekSalt: z.string(),
  transports: z.array(z.string()),
  algorithm: z.string(),
});

/**
 * Store a new passkey for the authenticated user
 */
export const storePasskeySF = createServerFn({ method: "POST" })
  .middleware([ensureViewerMiddleware])
  .inputValidator(storePasskeyInputSchema)
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
 * Get all passkeys for the authenticated user
 */
export const getUserPasskeysSF = createServerFn({ method: "GET" })
  .middleware([ensureViewerMiddleware])
  .handler(async ({ context }) => {
    const passkeys = await db()
      .select({
        credentialId: schema.passkeys.credential_id,
        wrappedDek: schema.passkeys.wrapped_dek,
        kekSalt: schema.passkeys.kek_salt,
        transports: schema.passkeys.transports,
        createdAt: schema.passkeys.created_at,
      })
      .from(schema.passkeys)
      .where(eq(schema.passkeys.user_id, context.viewer.id))
      .orderBy(schema.passkeys.created_at);

    return passkeys;
  });
