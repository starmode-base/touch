import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  contactRoleAssignmentsCollection,
  contactRolesCollection,
  contactsCollection,
  workspacesCollectionQuery,
} from "~/lib/collections";
import { genSecureToken } from "~/lib/secure-token";
import { createContactInputSchema } from "~/server-functions/contacts";
import { Button, ContactCard, EditInput } from "~/components/atoms";
import { useState, useMemo } from "react";
import { extractLinkedInAndName } from "~/lib/linkedin-extractor";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export const Route = createFileRoute("/$workspace/contacts/")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  const [isValid, setIsValid] = useState(false);

  const workspace = useLiveQuery((q) => {
    return q
      .from({ workspace: workspacesCollectionQuery })
      .where(({ workspace }) => eq(workspace.id, params.workspace));
  });
  const workspaceName = workspace.data[0]?.name ?? "";

  const contactRoles = useLiveQuery((q) => {
    return q
      .from({ contactRole: contactRolesCollection })
      .where(({ contactRole }) =>
        eq(contactRole.workspace_id, params.workspace),
      );
  });

  const contacts = useLiveQuery((q) => {
    return q
      .from({ contact: contactsCollection })
      .where(({ contact }) => eq(contact.workspace_id, params.workspace))
      .orderBy(({ contact }) => contact.created_at, "desc")
      .orderBy(({ contact }) => contact.id, "desc");
  });

  const roleAssignmentsWithRole = useLiveQuery((q) => {
    return q
      .from({ cra: contactRoleAssignmentsCollection })
      .where(({ cra }) => eq(cra.workspace_id, params.workspace))
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-2">
        <Link to="/" className="rounded p-2">
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div className="heading-1 flex shrink-0 py-2">
          <EditInput
            type="text"
            value={workspaceName}
            displayValue={workspaceName}
            onUpdate={(value) => {
              workspacesCollectionQuery.update(params.workspace, (draft) => {
                draft.name = value;
              });
            }}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">
        {contacts.data.map((contact) => (
          <ContactCard
            key={contact.id}
            name={contact.name}
            linkedin={contact.linkedin ?? undefined}
            onDelete={() => {
              const ok = confirm(
                "Are you sure you want to delete this contact?",
              );
              if (!ok) return;
              contactsCollection.delete(contact.id);
            }}
            onUpdate={(args) => {
              contactsCollection.update(contact.id, (draft) => {
                draft.name = args.name;
                draft.linkedin = args.linkedin ?? null;
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
                workspace_id: params.workspace,
                contact_id: contact.id,
                contact_role_id: roleId,
              });
            }}
            onRoleDelete={(roleId) => {
              const key = params.workspace + "|" + contact.id + "|" + roleId;
              contactRoleAssignmentsCollection.delete(key);
            }}
          />
        ))}
      </div>
      <div className="h-1/2 shrink-0 border-t border-slate-200 bg-slate-100 p-8">
        <form
          className="flex gap-2"
          onInput={(e) => {
            const fd = new FormData(e.currentTarget);

            const ok = createContactInputSchema.safeParse({
              name: fd.get("name"),
              linkedin: null,
              workspaceId: params.workspace,
            }).success;

            setIsValid(e.currentTarget.checkValidity() && ok);
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);

            const values = createContactInputSchema.parse({
              name: fd.get("name"),
              linkedin: null,
              workspaceId: params.workspace,
            });

            const { name, linkedinUrl } = extractLinkedInAndName(values.name);

            contactsCollection.insert({
              id: genSecureToken(),
              workspace_id: values.workspaceId,
              name,
              linkedin: linkedinUrl,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            e.currentTarget.reset();
            setIsValid(false);
          }}
        >
          <input
            type="text"
            name="name"
            placeholder="Contact name"
            required
            autoFocus
            data-1p-ignore // 1password ignore
            className="flex-1 rounded border border-slate-200 px-2"
          />
          <Button type="submit" disabled={!isValid} role="button">
            Add [Enter]
          </Button>
        </form>
      </div>
    </div>
  );
}
