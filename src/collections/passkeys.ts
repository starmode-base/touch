import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import z from "zod";
import { queryClient } from "~/lib/query-client";
import {
  storePasskeySF,
  deletePasskeySF,
  listPasskeysSF,
} from "~/server-functions/passkeys";

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
  algorithm: z.int(),
  rp_name: z.string(),
  rp_id: z.string(),
  webauthn_user_id: z.string(),
  webauthn_user_name: z.string(),
  webauthn_user_display_name: z.string(),
});
export type Passkey = z.infer<typeof Passkey>;

/**
 * Passkeys collection
 */
export const passkeysCollection = createCollection(
  queryCollectionOptions({
    id: "passkeys",
    queryKey: ["passkeys"],
    queryFn: () => listPasskeysSF(),
    queryClient,
    // Only sync in the browser: during SSR there is no Start context for
    // server-function RPC calls
    enabled: typeof window !== "undefined",
    schema: Passkey,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        credentialId: item.modified.credential_id,
        publicKey: item.modified.public_key,
        wrappedDek: item.modified.wrapped_dek,
        kekSalt: item.modified.kek_salt,
        transports: item.modified.transports,
        algorithm: item.modified.algorithm,
        rpName: item.modified.rp_name,
        rpId: item.modified.rp_id,
        webauthnUserId: item.modified.webauthn_user_id,
        webauthnUserName: item.modified.webauthn_user_name,
        webauthnUserDisplayName: item.modified.webauthn_user_display_name,
      }));

      await Promise.all(data.map((item) => storePasskeySF({ data: item })));
    },
    onDelete: async ({ transaction }) => {
      const ids = transaction.mutations.map((item) => item.modified.id);

      await deletePasskeySF({ data: { ids } });
    },
  }),
);
