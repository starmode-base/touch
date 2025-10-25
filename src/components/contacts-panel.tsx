import { Link } from "@tanstack/react-router";
import { Contacts } from "~/components/contacts";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button, EditInput } from "~/components/atoms";
import { eq, useLiveQuery } from "@tanstack/react-db";
import {
  contactsCollection,
  workspacesCollectionQuery,
} from "~/lib/collections";
import { createContactInputSchema } from "~/server-functions/contacts";
import { useState } from "react";
import { extractLinkedInAndName } from "~/lib/linkedin-extractor";
import { genSecureToken } from "~/lib/secure-token";
import { useE2EE } from "~/lib/e2ee-context";
import { UserButton } from "@clerk/tanstack-react-start";

export function ContactsPanel(props: { workspaceId: string }) {
  const [isValid, setIsValid] = useState(false);
  const { lock } = useE2EE();

  const workspace = useLiveQuery((q) => {
    return q
      .from({ workspace: workspacesCollectionQuery })
      .where(({ workspace }) => eq(workspace.id, props.workspaceId));
  });
  const workspaceName = workspace.data[0]?.name ?? "";

  const handleLock = () => {
    lock();
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-2 py-1">
        <div className="flex items-center gap-2">
          <Link to="/" className="rounded p-2">
            <ArrowLeftIcon className="size-5" />
          </Link>
          <div className="heading-1">
            <EditInput
              type="text"
              value={workspaceName}
              displayValue={workspaceName}
              onUpdate={(value) => {
                workspacesCollectionQuery.update(props.workspaceId, (draft) => {
                  draft.name = value;
                });
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleLock}>Lock</Button>
          <UserButton />
        </div>
      </div>
      <Contacts workspaceId={props.workspaceId} />
      <form
        className="flex items-center border-t border-slate-200 bg-slate-100 px-2"
        onInput={(e) => {
          const fd = new FormData(e.currentTarget);

          const ok = createContactInputSchema.safeParse({
            name: fd.get("name"),
            linkedin: null,
            workspaceId: props.workspaceId,
          }).success;

          setIsValid(e.currentTarget.checkValidity() && ok);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);

          const values = createContactInputSchema.parse({
            name: fd.get("name"),
            linkedin: null,
            workspaceId: props.workspaceId,
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
          className="flex-1 p-2 outline-none"
        />
        <Button type="submit" disabled={!isValid} role="button">
          Add [Enter]
        </Button>
      </form>
    </div>
  );
}
