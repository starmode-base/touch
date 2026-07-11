/**
 * Examples
 *
 * https://tanstack.com/db/latest/docs/overview
 * https://tanstack.com/db/latest/docs/collections/query-collection
 * https://github.com/TanStack/db/tree/main/examples/react
 */
import {
  createCollection,
  localOnlyCollectionOptions,
} from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import type { z } from "zod";
import { queryClient } from "#lib/query-client";
import { selectContactSchema } from "#postgres/validation";
import {
  createContactSF,
  deleteContactSF,
  listContactsSF,
  updateContactSF,
} from "#server-functions/contacts";
import { decryptField, encryptField } from "#lib/e2ee";
import { genSecureToken } from "../lib/secure-token";
import { getSessionDek } from "#lib/e2ee-actions";
import { cryptoSession } from "#lib/e2ee-session";
import { passkeysCollection } from "./passkeys";

/**
 * Contact row
 *
 * The name field is ciphertext in the encrypted collection and plaintext in
 * the decrypted collection.
 */
const Contact = selectContactSchema;
type Contact = z.infer<typeof Contact>;

/**
 * Encrypted contacts collection (server-backed)
 */
const contactsCollectionEncrypted = createCollection(
  queryCollectionOptions({
    id: "contacts-encrypted",
    queryKey: ["contacts"],
    queryFn: () => listContactsSF(),
    queryClient,
    // Only sync in the browser: during SSR there is no Start context for
    // server-function RPC calls
    enabled: typeof window !== "undefined",
    schema: Contact,
    getKey: (item) => item.id,

    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => {
        return {
          id: item.modified.id,
          name: item.modified.name,
          linkedin: item.modified.linkedin,
        };
      });

      const contacts = await createContactSF({ data });

      // Write the authoritative rows back instead of refetching
      contactsCollectionEncrypted.utils.writeBatch(() => {
        for (const contact of contacts) {
          contactsCollectionEncrypted.utils.writeUpsert(contact);
        }
      });

      return { refetch: false };
    },
    onUpdate: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        key: {
          id: String(item.key),
        },
        fields: {
          name: item.modified.name,
          linkedin: item.modified.linkedin,
        },
      }));

      const contacts = await updateContactSF({ data });

      // Write the authoritative rows back instead of refetching
      contactsCollectionEncrypted.utils.writeBatch(() => {
        for (const contact of contacts) {
          contactsCollectionEncrypted.utils.writeUpsert(contact);
        }
      });

      return { refetch: false };
    },
    onDelete: async ({ transaction }) => {
      const ids = transaction.mutations.map((item) => String(item.key));

      await deleteContactSF({ data: { ids } });

      // Remove the rows locally instead of refetching
      contactsCollectionEncrypted.utils.writeBatch(() => {
        for (const id of ids) {
          contactsCollectionEncrypted.utils.writeDelete(id);
        }
      });

      return { refetch: false };
    },
  }),
);

/**
 * Decrypted contacts collection (Client-only)
 *
 * https://tanstack.com/db/latest/docs/reference/functions/localOnlyCollectionOptions
 */
const contactsCollection = createCollection(
  localOnlyCollectionOptions({
    id: "contacts-decrypted",
    schema: Contact,
    getKey: (item) => item.id,
  }),
);

/**
 * Decryption queue
 *
 * Holds IDs of contacts that need to be decrypted. Events are queued here
 * when they arrive from the server, and processed when DEK becomes available.
 */
const decryptionQueue = new Set<string>();

/**
 * Upsert a contact into the decrypted collection with its fields as-is
 */
function upsertDecrypted(contact: Contact) {
  if (contactsCollection.has(contact.id)) {
    contactsCollection.update(contact.id, (draft) => {
      draft.name = contact.name;
      draft.linkedin = contact.linkedin;
      draft.created_at = contact.created_at;
      draft.updated_at = contact.updated_at;
      draft.user_id = contact.user_id;
    });
  } else {
    contactsCollection.insert({ ...contact });
  }
}

/**
 * Subscribe to encrypted collection changes and queue for decryption
 *
 * While the session is locked, rows are seeded into the decrypted collection
 * with their ciphertext as-is so the app stays browsable; the decryption
 * queue overwrites them with plaintext once a DEK becomes available. While
 * unlocked, rows go straight through the queue to avoid a ciphertext flash.
 */
contactsCollectionEncrypted.subscribeChanges((changes) => {
  for (const change of changes) {
    if (change.type === "insert" || change.type === "update") {
      if (!cryptoSession.exists()) {
        upsertDecrypted(change.value);
      }

      // Queue contact for decryption
      decryptionQueue.add(change.value.id);
    } else {
      // Remove from queue and decrypted collection. The row may never have
      // reached the decrypted collection; deleting a missing key throws.
      decryptionQueue.delete(String(change.key));
      if (contactsCollection.has(String(change.key))) {
        contactsCollection.delete(String(change.key));
      }
    }
  }

  // Try to process queue (will return early if no DEK)
  void processDecryptionQueue();
});

/**
 * Process the decryption queue
 *
 * Decrypts all queued contacts if DEK is available. Called:
 * 1. When new events arrive (subscription handler)
 * 2. When session unlocks (via cryptoSession.onUnlock callback)
 * 3. When passkeys collection first loads
 */
async function processDecryptionQueue(): Promise<void> {
  if (decryptionQueue.size === 0) {
    return;
  }

  const dek = await getSessionDek();
  if (!dek) {
    // Not ready yet (session or passkeys not available)
    return;
  }

  const queuedIds = Array.from(decryptionQueue);

  for (const contactId of queuedIds) {
    const encrypted = contactsCollectionEncrypted.get(contactId);

    if (!encrypted) {
      decryptionQueue.delete(contactId);
      continue;
    }

    // Decrypt name
    const namePlaintext = await decryptField(encrypted.name, dek);

    // Check if contact already exists in decrypted collection
    const existingDecrypted = contactsCollection.get(contactId);

    if (existingDecrypted) {
      // Update existing contact
      contactsCollection.update(contactId, (draft) => {
        draft.name = namePlaintext;
        draft.linkedin = encrypted.linkedin;
        draft.created_at = encrypted.created_at;
        draft.updated_at = encrypted.updated_at;
        draft.user_id = encrypted.user_id;
      });
    } else {
      // Insert new contact
      contactsCollection.insert({
        id: encrypted.id,
        name: namePlaintext,
        linkedin: encrypted.linkedin,
        created_at: encrypted.created_at,
        updated_at: encrypted.updated_at,
        user_id: encrypted.user_id,
      });
    }

    // Remove from queue
    decryptionQueue.delete(contactId);
  }
}

// Register queue processor to run when session unlocks
cryptoSession.onUnlock(() => {
  void processDecryptionQueue();
});

// Register queue processor to run when passkeys collection first loads
let passkeysReady = false;
passkeysCollection.subscribeChanges(() => {
  if (!passkeysReady && passkeysCollection.size > 0) {
    passkeysReady = true;
    void processDecryptionQueue();
  }
});

/**
 * Public API for contacts
 */
export const contactsStore = {
  /** Queryable collection */
  collection: contactsCollection,

  /** Encrypted collection - don't use this directly */
  // encryptedCollection: contactsCollectionEncrypted,

  /** Insert a new contact */
  insert: async (data: {
    userId: string;
    name: string;
    linkedin: string | null;
  }) => {
    const dek = await getSessionDek();
    if (!dek) {
      throw new Error("Encryption not ready. Please unlock or wait for sync.");
    }

    const nameEncrypted = await encryptField(data.name, dek);

    return contactsCollectionEncrypted.insert({
      id: genSecureToken(),
      user_id: data.userId,
      name: nameEncrypted,
      linkedin: data.linkedin,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },

  /** Update an existing contact */
  update: async (
    id: string,
    data: { name: string; linkedin?: string | undefined },
  ) => {
    const dek = await getSessionDek();
    if (!dek) {
      throw new Error("Encryption not ready. Please unlock or wait for sync.");
    }

    const nameEncrypted = await encryptField(data.name, dek);

    return contactsCollectionEncrypted.update(id, (draft) => {
      draft.name = nameEncrypted;
      draft.linkedin = data.linkedin ?? null;
    });
  },

  /** Delete an existing contact */
  delete: (id: string) => {
    return contactsCollectionEncrypted.delete(id);
  },

  /**
   * Clear all data (encrypted, decrypted, and queue)
   *
   * Called when locking DEK or signing out. Clears everything including
   * the encrypted collection, which will stop syncing.
   */
  clear: async () => {
    // Clean up the encrypted collection by stopping sync and clearing data
    await contactsCollectionEncrypted.cleanup();

    // Clear any remaining items in the decryption queue so no more data is
    // pushed on to contactsCollection
    decryptionQueue.clear();

    // Clean up the decrypted collection by stopping sync and clearing data
    await contactsCollection.cleanup();
  },

  startSync: () => {
    contactsCollectionEncrypted.startSyncImmediate();
    contactsCollection.startSyncImmediate();
  },

  /**
   * Resolves when the encrypted collection has completed its first fetch
   * (decryption happens asynchronously afterwards)
   */
  preload: () => {
    return Promise.all([
      contactsCollectionEncrypted.preload(),
      contactsCollection.preload(),
    ]);
  },

  /**
   * Refetch the encrypted collection from the server
   *
   * No-op unless the collection has synced before, so it is safe to call
   * while signed out or locked (after lock, sync stays stopped until unlock).
   */
  refetch: async () => {
    if (contactsCollectionEncrypted.status !== "ready") return;
    await contactsCollectionEncrypted.utils.refetch();
  },
};
