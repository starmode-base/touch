import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import {
  contactsCollection,
  workspacesCollectionQuery,
} from "~/lib/collections";
import { genSecureToken } from "~/lib/secure-token";
import { createContactInputSchema } from "~/server-functions/contacts";
import { Button, ContactCard, EditInput } from "~/components/atoms";
import { useState } from "react";
import { extractLinkedInAndName } from "~/lib/linkedin-extractor";

export const Route = createFileRoute("/$workspace/contacts/")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  const [isValid, setIsValid] = useState(false);

  const contacts = useLiveQuery((q) => {
    return q
      .from({ contact: contactsCollection })
      .where(({ contact }) => eq(contact.workspace_id, params.workspace))
      .orderBy(({ contact }) => contact.created_at, "desc")
      .orderBy(({ contact }) => contact.id, "desc");
  });

  const workspace = useLiveQuery((q) => {
    return q
      .from({ workspace: workspacesCollectionQuery })
      .where(({ workspace }) => eq(workspace.id, params.workspace));
  });
  const workspaceName = workspace.data[0]?.name ?? "";

  return (
    <div className="flex flex-1 flex-col">
      <div className="heading-1 shrink-0 px-6 py-2">
        <EditInput
          type="text"
          value={workspaceName}
          displayValue={`${workspaceName} — Contacts`}
          onUpdate={(value) => {
            workspacesCollectionQuery.update(params.workspace, (draft) => {
              draft.name = value;
            });
          }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
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
          />
        ))}
      </div>
      <div className="shrink-0 bg-slate-100 p-2">
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
