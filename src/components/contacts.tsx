import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  contactRoleAssignmentsCollection,
  contactRolesCollection,
} from "~/lib/collections";
import { contactsStore } from "~/collections/contacts-collection";
import { ContactCard } from "~/components/atoms";
import { useMemo } from "react";

export function Contacts(props: { workspaceId: string }) {
  const contactRoles = useLiveQuery((q) => {
    return q
      .from({ contactRole: contactRolesCollection })
      .where(({ contactRole }) =>
        eq(contactRole.workspace_id, props.workspaceId),
      );
  });

  const encryptedContacts = useLiveQuery((q) => {
    return q
      .from({ contact: contactsStore.encryptedCollection })
      .where(({ contact }) => eq(contact.workspace_id, props.workspaceId))
      .orderBy(({ contact }) => contact.created_at, "desc")
      .orderBy(({ contact }) => contact.id, "desc");
  });
  console.log("encryptedContacts", encryptedContacts.data);

  // Query decrypted contacts with workspace filter and sorting
  const contacts = useLiveQuery((q) => {
    return q
      .from({ contact: contactsStore.collection })
      .where(({ contact }) => eq(contact.workspace_id, props.workspaceId))
      .orderBy(({ contact }) => contact.created_at, "desc")
      .orderBy(({ contact }) => contact.id, "desc");
  });
  console.log("contacts         ", contacts.data);

  const roleAssignmentsWithRole = useLiveQuery((q) => {
    return q
      .from({ cra: contactRoleAssignmentsCollection })
      .where(({ cra }) => eq(cra.workspace_id, props.workspaceId))
      .innerJoin({ role: contactRolesCollection }, ({ cra, role }) =>
        eq(cra.contact_role_id, role.id),
      )
      .select(({ cra, role }) => ({
        contact_id: cra.contact_id,
        role: { id: role.id, name: role.name },
      }));
  });

  const activeRolesByContactId = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();

    for (const row of roleAssignmentsWithRole.data) {
      const current = map.get(row.contact_id) ?? [];
      current.push({ id: row.role.id, name: row.role.name });
      map.set(row.contact_id, current);
    }

    return map;
  }, [roleAssignmentsWithRole.data]);

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
      {contacts.data.map((contact) => (
        <ContactCard
          key={contact.id}
          createdAt={contact.created_at}
          workspaceId={props.workspaceId}
          id={contact.id}
          name={contact.name}
          linkedin={contact.linkedin ?? undefined}
          onDelete={() => {
            const ok = confirm("Are you sure you want to delete this contact?");
            if (!ok) return;
            contactsStore.delete(contact.id);
          }}
          onUpdate={(args) => {
            void contactsStore.update(contact.id, {
              name: args.name,
              linkedin: args.linkedin,
            });
          }}
          roles={contactRoles.data
            .filter(
              (role) =>
                !activeRolesByContactId
                  .get(contact.id)
                  ?.some((r) => r.id === role.id),
            )
            .map((role) => {
              return {
                id: role.id,
                name: role.name,
              };
            })}
          activeRoles={activeRolesByContactId.get(contact.id) ?? []}
          onRoleClick={(roleId) => {
            contactRoleAssignmentsCollection.insert({
              workspace_id: props.workspaceId,
              contact_id: contact.id,
              contact_role_id: roleId,
            });
          }}
          onRoleDelete={(roleId) => {
            const key = props.workspaceId + "|" + contact.id + "|" + roleId;
            contactRoleAssignmentsCollection.delete(key);
          }}
        />
      ))}
    </div>
  );
}
