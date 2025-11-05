import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import z from "zod";
import { storePasskeySF, deletePasskeySF } from "~/server-functions/passkeys";

const Passkey = z.object({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  user_id: z.string(),
  credential_id: z.string(),
  public_key: z.string(),
  wrapped_dek: z.string(),
  kek_salt: z.string(),
  transports: z.array(z.string()),
  algorithm: z.string(),
});
export type Passkey = z.infer<typeof Passkey>;

/**
 * Passkeys collection (Electric)
 */
export const passkeysCollection = createCollection(
  electricCollectionOptions({
    id: "passkeys-electric",
    schema: Passkey,
    getKey: (item) => item.credential_id,
    shapeOptions: {
      url: new URL(
        `/api/passkeys`,
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost",
      ).toString(),
    },
    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        credentialId: item.modified.credential_id,
        publicKey: item.modified.public_key,
        wrappedDek: item.modified.wrapped_dek,
        kekSalt: item.modified.kek_salt,
        transports: item.modified.transports,
        algorithm: item.modified.algorithm,
      }));

      await Promise.all(data.map((item) => storePasskeySF({ data: item })));
    },
    onDelete: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        credentialId: item.modified.credential_id,
      }));

      await Promise.all(data.map((item) => deletePasskeySF({ data: item })));
    },
  }),
);
