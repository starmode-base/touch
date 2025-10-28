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
  getGlobalDek,
  hasGlobalDek,
  encryptField,
} from "~/lib/e2ee";
import { genSecureToken } from "../lib/secure-token";

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
 */
const contactsCollection = createCollection(
  localOnlyCollectionOptions({
    id: "contacts-decrypted",
    schema: Contact,
    getKey: (item) => item.id,
  }),
);

/**
 * Decrypt and insert a contact in the decrypted collection
 */
async function insertDecryptedContact(encrypted: Contact): Promise<void> {
  if (!hasGlobalDek()) {
    return;
  }

  const dek = getGlobalDek();
  const namePlaintext = await decryptField(encrypted.name, dek);

  contactsCollection.insert({
    id: encrypted.id,
    name: namePlaintext,
    linkedin: encrypted.linkedin,
    created_at: encrypted.created_at,
    updated_at: encrypted.updated_at,
    user_id: encrypted.user_id,
  });
}

/**
 * Decrypt and update a contact in the decrypted collection
 */
async function updateDecryptedContact(encrypted: Contact): Promise<void> {
  if (!hasGlobalDek()) {
    return;
  }

  const dek = getGlobalDek();
  const namePlaintext = await decryptField(encrypted.name, dek);

  contactsCollection.update(encrypted.id, (draft) => {
    draft.name = namePlaintext;
    draft.linkedin = encrypted.linkedin;
    draft.created_at = encrypted.created_at;
    draft.updated_at = encrypted.updated_at;
    draft.user_id = encrypted.user_id;
  });
}

/**
 * Subscribe to encrypted collection changes and sync to decrypted collection
 *
 * All syncing happens here in the background as Electric emits change events.
 * The DEK must be available before Electric starts syncing, otherwise changes
 * will be silently dropped (insert/update functions return early without DEK).
 */
contactsCollectionEncrypted.subscribeChanges((changes) => {
  console.log("changes", changes);
  for (const change of changes) {
    const value = change.value;

    if (change.type === "insert") {
      void insertDecryptedContact(value);
    } else if (change.type === "update") {
      void updateDecryptedContact(value);
    } else {
      contactsCollection.delete(String(change.key));
    }
  }
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
    const dek = getGlobalDek();
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
    const dek = getGlobalDek();
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

  /** Clear all decrypted contacts and encrypted collection */
  clear: async () => {
    // cleanup() stops sync and clears data
    await contactsCollection.cleanup();
    await contactsCollectionEncrypted.cleanup();
  },
};
