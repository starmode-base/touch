import { useEffect, useRef } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { contactsStore, contactsCollectionEncrypted } from "~/lib/collections";
import { decryptField, getGlobalDek, hasGlobalDek } from "~/lib/e2ee";

/**
 * Hook that syncs encrypted contacts to the decrypted collection
 *
 * This hook watches the encrypted Electric collection, decrypts contacts,
 * and keeps the decrypted (client-only) collection in sync.
 */
export function useContactsWithDecryption() {
  const encryptedContacts = useLiveQuery((q) => {
    return q.from({ contact: contactsCollectionEncrypted });
  });

  // Track which encrypted contacts (by ciphertext hash) we've already processed
  const processedHashes = useRef(new Set<string>());

  // Sync encrypted → decrypted collection
  useEffect(() => {
    async function syncContacts() {
      // Don't decrypt if still loading or DEK not available
      if (encryptedContacts.isLoading || !hasGlobalDek()) {
        return;
      }

      const dek = getGlobalDek();

      // Process each encrypted contact
      for (const item of encryptedContacts.data) {
        // Create a hash to track if we've processed this exact data
        const hash = `${item.id}:${item.name}:${item.updated_at}`;

        if (processedHashes.current.has(hash)) {
          continue;
        }

        // Decrypt the name
        const namePlaintext = await decryptField(item.name, dek);

        // Check if contact exists in decrypted collection
        const existing = contactsStore.collection.state.get(item.id);

        if (existing) {
          // Update existing
          contactsStore.collection.update(item.id, (draft) => {
            draft.name = namePlaintext;
            draft.linkedin = item.linkedin;
            draft.created_at = item.created_at;
            draft.updated_at = item.updated_at;
            draft.workspace_id = item.workspace_id;
          });
        } else {
          // Insert new
          contactsStore.collection.insert({
            id: item.id,
            name: namePlaintext,
            linkedin: item.linkedin,
            created_at: item.created_at,
            updated_at: item.updated_at,
            workspace_id: item.workspace_id,
          });
        }

        processedHashes.current.add(hash);
      }

      // Remove contacts that no longer exist in encrypted collection
      const encryptedIds = new Set(encryptedContacts.data.map((c) => c.id));
      for (const [id] of contactsStore.collection.state) {
        if (!encryptedIds.has(id)) {
          contactsStore.collection.delete(id);
          // Clean up processed hashes for deleted contacts
          for (const hash of processedHashes.current) {
            if (hash.startsWith(`${id}:`)) {
              processedHashes.current.delete(hash);
            }
          }
        }
      }
    }

    void syncContacts();
  }, [encryptedContacts.data, encryptedContacts.isLoading]);
}
