import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db, schema } from "~/postgres/db";
import { syncViewer } from "~/lib/auth";
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
  .inputValidator(storePasskeyInputSchema)
  .handler(async ({ data }) => {
    const viewer = await syncViewer();
    if (!viewer) {
      throw new Error("Unauthorized");
    }

    const [passkey] = await db()
      .insert(schema.passkeys)
      .values({
        userId: viewer.id,
        credentialId: data.credentialId,
        publicKey: data.publicKey,
        wrappedDek: data.wrappedDek,
        kekSalt: data.kekSalt,
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
export const getUserPasskeysSF = createServerFn({ method: "GET" }).handler(
  async () => {
    const viewer = await syncViewer();
    if (!viewer) {
      throw new Error("Unauthorized");
    }

    const passkeys = await db()
      .select({
        credentialId: schema.passkeys.credentialId,
        wrappedDek: schema.passkeys.wrappedDek,
        kekSalt: schema.passkeys.kekSalt,
        transports: schema.passkeys.transports,
        createdAt: schema.passkeys.createdAt,
      })
      .from(schema.passkeys)
      .where(eq(schema.passkeys.userId, viewer.id))
      .orderBy(schema.passkeys.createdAt);

    return passkeys;
  },
);
