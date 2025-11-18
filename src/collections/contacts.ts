/**
 * Examples
 *
 * https://github.com/electric-sql/electric/tree/main/examples/tanstack-db-web-starter
 * https://electric-sql.com/blog/2025/07/29/local-first-sync-with-tanstack-db
 * https://tanstack.com/db/latest/docs/overview#2-electricsql-sync
 * https://tanstack.com/db/latest/docs/collections/electric-collection
 * https://github.com/TanStack/db/tree/main/examples/react
 */
import {
  createCollection,
  localOnlyCollectionOptions,
} from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import z from "zod";
import {
  createContactSF,
  deleteContactSF,
  updateContactSF,
} from "~/server-functions/contacts";
import {
  decryptField,
  hasGlobalDek,
  encryptField,
  onDekUnlock,
} from "~/lib/e2ee";
import { genSecureToken } from "../lib/secure-token";
import { getSessionDek } from "~/lib/e2ee-app";

const Contact = z.object({
  id: z.string(),
  /** Ciphertext in encrypted collection and plaintext in decrypted collection */
  name: z.string(),
  linkedin: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  user_id: z.string(),
});
type Contact = z.infer<typeof Contact>;

/**
 * Encrypted contacts collection (Electric-backed)
 */
const contactsCollectionEncrypted = createCollection(
  electricCollectionOptions({
    id: "contacts-encrypted",
    schema: Contact,
    getKey: (item) => item.id,
    shapeOptions: {
      url: new URL(
        `/api/contacts`,
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost",
      ).toString(),
    },

    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => {
        return {
          userId: item.modified.user_id,
          name: item.modified.name,
          linkedin: item.modified.linkedin,
        };
      });

      const txid = await createContactSF({ data });

      return { txid };
    },
    onUpdate: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => ({
        key: {
          id: item.modified.id,
        },
        fields: {
          name: item.modified.name,
          linkedin: item.modified.linkedin,
        },
      }));

      const txid = await updateContactSF({ data });

      return { txid };
    },
    onDelete: async ({ transaction }) => {
      const ids = transaction.mutations.map((item) => item.modified.id);

      const txid = await deleteContactSF({ data: { ids } });

      return { txid };
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
 * when they arrive from Electric, and processed when DEK becomes available.
 */
const decryptionQueue = new Set<string>();

/**
 * Subscribe to encrypted collection changes and queue for decryption
 */
contactsCollectionEncrypted.subscribeChanges((changes) => {
  for (const change of changes) {
    if (change.type === "insert" || change.type === "update") {
      // Queue contact for decryption
      decryptionQueue.add(change.value.id);
    } else {
      // Remove from queue and decrypted collection
      decryptionQueue.delete(String(change.key));
      contactsCollection.delete(String(change.key));
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
 * 2. When DEK unlocks (via onDekUnlock callback)
 */
async function processDecryptionQueue(): Promise<void> {
  if (!hasGlobalDek()) {
    return;
  }

  if (decryptionQueue.size === 0) {
    return;
  }

  const dek = await getSessionDek();
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

// Register queue processor to run when DEK unlocks
onDekUnlock(() => {
  void processDecryptionQueue();
});

/**
 * Public API for contacts
 */
export const contactsStore = {
  /** Queryable collection */
  collection: contactsCollection,
  /** Encrypted collection - don't use this directly */
  encryptedCollection: contactsCollectionEncrypted,

  /** Insert a new contact */
  insert: async (data: {
    userId: string;
    name: string;
    linkedin: string | null;
  }) => {
    const dek = await getSessionDek();
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
  update: async (id: string, data: { name: string; linkedin?: string }) => {
    const dek = await getSessionDek();
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
   * the encrypted collection, which will stop Electric sync.
   */
  clear: async () => {
    // Clear decrypted collection (plaintext)
    await contactsCollection.cleanup();

    // Clear encrypted collection (stops Electric sync)
    await contactsCollectionEncrypted.cleanup();

    // Clear decryption queue
    decryptionQueue.clear();
  },
};
