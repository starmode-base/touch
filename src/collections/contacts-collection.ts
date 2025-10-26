import { useEffect, useRef } from "react";
import {
  createCollection,
  localOnlyCollectionOptions,
  useLiveQuery,
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
import { useE2ee } from "~/components/hooks/e2ee";

/**
 * Encrypted contacts collection (Electric-backed)
 */
const contactsCollectionEncrypted = createCollection(
  electricCollectionOptions({
    // id: "contacts-encrypted",
    schema: z.object({
      id: z.string(),
      /** Ciphertext */
      name: z.string(),
      linkedin: z.string().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
      workspace_id: z.string(),
    }),
    getKey: (item) => item.id,
    shapeOptions: {
      url: new URL(`/api/contacts`, window.location.origin).toString(),
    },
    onInsert: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => {
        return {
          workspaceId: item.modified.workspace_id,
          name: item.modified.name,
          linkedin: item.modified.linkedin,
        };
      });

      const txid = await Promise.all(
        data.map((item) => createContactSF({ data: item })),
      );

      return { txid: txid.map((item) => item.txid) };
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

      const txid = await Promise.all(
        data.map((item) => updateContactSF({ data: item })),
      );

      return { txid: txid.map((item) => item.txid) };
    },
    onDelete: async ({ transaction }) => {
      const data = transaction.mutations.map((item) => item.modified.id);

      const txid = await Promise.all(
        data.map((item) => deleteContactSF({ data: { id: item } })),
      );

      return { txid: txid.map((item) => item.txid) };
    },
  }),
);

/**
 * Decrypted contacts collection (Client-only)
 */
const contactsCollection = createCollection(
  localOnlyCollectionOptions({
    // id: "contacts-decrypted",
    schema: z.object({
      id: z.string(),
      /** Plaintext */
      name: z.string(),
      linkedin: z.string().nullable(),
      created_at: z.string(),
      updated_at: z.string(),
      workspace_id: z.string(),
    }),
    getKey: (item) => item.id,
  }),
);

interface EncryptedContact {
  id: string;
  name: string;
  linkedin: string | null;
  created_at: string;
  updated_at: string;
  workspace_id: string;
}

/**
 * Create a hash of all contact fields for change detection
 * Format: id:field1:field2:... (id first for easy cleanup by prefix)
 */
function createHash(contact: EncryptedContact): string {
  return [
    contact.id,
    contact.name,
    contact.linkedin ?? "null",
    contact.created_at,
    contact.updated_at,
    contact.workspace_id,
  ].join(":");
}

/**
 * Decrypt a contact and upsert into the decrypted collection
 */
async function syncContact(
  encrypted: EncryptedContact,
  dek: Uint8Array,
  collection: typeof contactsCollection,
): Promise<void> {
  const namePlaintext = await decryptField(encrypted.name, dek);

  const existing = collection.state.get(encrypted.id);

  if (existing) {
    collection.update(encrypted.id, (draft) => {
      draft.name = namePlaintext;
      draft.linkedin = encrypted.linkedin;
      draft.created_at = encrypted.created_at;
      draft.updated_at = encrypted.updated_at;
      draft.workspace_id = encrypted.workspace_id;
    });
  } else {
    collection.insert({
      id: encrypted.id,
      name: namePlaintext,
      linkedin: encrypted.linkedin,
      created_at: encrypted.created_at,
      updated_at: encrypted.updated_at,
      workspace_id: encrypted.workspace_id,
    });
  }
}

/**
 * Remove contacts from decrypted collection that no longer exist in encrypted collection
 */
function removeDeletedContacts(
  encryptedIds: Set<string>,
  collection: typeof contactsCollection,
  processedHashes: Set<string>,
): void {
  for (const [id] of collection.state) {
    if (!encryptedIds.has(id)) {
      collection.delete(id);

      // Clean up processed hashes for deleted contacts
      for (const hash of processedHashes) {
        if (hash.startsWith(`${id}:`)) {
          processedHashes.delete(hash);
        }
      }
    }
  }
}

/**
 * Hook that syncs encrypted contacts to the decrypted collection
 *
 * Watches the encrypted Electric collection, decrypts contacts,
 * and keeps the decrypted (client-only) collection in sync.
 *
 * Also handles DEK lock/unlock by clearing decrypted data when locked.
 */
export function useContactsSync(): void {
  const { isDekUnlocked } = useE2ee();

  const encryptedContacts = useLiveQuery((q) => {
    return q.from({ contact: contactsCollectionEncrypted });
  });

  // Track which encrypted contacts (by ciphertext hash) we've already processed
  const processedHashes = useRef(new Set<string>());

  // Clear decrypted collection and reset tracking when DEK is locked
  useEffect(() => {
    if (!isDekUnlocked) {
      // Clear all decrypted contacts
      for (const [id] of contactsCollection.state) {
        contactsCollection.delete(id);
      }

      // Reset processed hashes
      processedHashes.current.clear();
    }
  }, [isDekUnlocked]);

  // Sync encrypted contacts to decrypted collection
  useEffect(() => {
    async function sync() {
      if (encryptedContacts.isLoading || !hasGlobalDek()) {
        return;
      }

      const dek = getGlobalDek();

      // Collect contacts that need processing
      const itemsToProcess: {
        contact: EncryptedContact;
        hash: string;
      }[] = [];

      for (const item of encryptedContacts.data) {
        const hash = createHash(item);

        if (!processedHashes.current.has(hash)) {
          itemsToProcess.push({ contact: item, hash });
        }
      }

      // Parallelize decryption for all items that need processing
      await Promise.all(
        itemsToProcess.map(async ({ contact, hash }) => {
          await syncContact(contact, dek, contactsCollection);
          processedHashes.current.add(hash);
        }),
      );

      // Remove contacts that no longer exist in encrypted collection
      const encryptedIds = new Set(encryptedContacts.data.map((c) => c.id));
      removeDeletedContacts(
        encryptedIds,
        contactsCollection,
        processedHashes.current,
      );
    }

    void sync();
  }, [encryptedContacts.data, encryptedContacts.isLoading]);
}

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
    workspaceId: string;
    name: string;
    linkedin: string | null;
  }) => {
    const dek = getGlobalDek();
    const nameEncrypted = await encryptField(data.name, dek);

    return contactsCollectionEncrypted.insert({
      id: genSecureToken(),
      workspace_id: data.workspaceId,
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
};
