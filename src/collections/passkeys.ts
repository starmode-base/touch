import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { z } from "zod";
import { queryClient } from "~/lib/query-client";
import {
  storePasskeySF,
  deletePasskeySF,
  listPasskeysSF,
} from "~/server-functions/passkeys";
import { selectPasskeySchema } from "~/postgres/validation";

const Passkey = selectPasskeySchema;
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
        id: item.modified.id,
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

      const passkeys = await Promise.all(
        data.map((item) => storePasskeySF({ data: item })),
      );

      // Write the authoritative rows back instead of refetching
      passkeysCollection.utils.writeBatch(() => {
        for (const passkey of passkeys) {
          passkeysCollection.utils.writeUpsert(passkey);
        }
      });

      return { refetch: false };
    },
    onDelete: async ({ transaction }) => {
      const ids = transaction.mutations.map((item) => String(item.key));

      await deletePasskeySF({ data: { ids } });

      // Remove the rows locally instead of refetching
      passkeysCollection.utils.writeBatch(() => {
        for (const id of ids) {
          passkeysCollection.utils.writeDelete(id);
        }
      });

      return { refetch: false };
    },
  }),
);
