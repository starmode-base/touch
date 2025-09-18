import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  contactsCollection,
  workspacesCollectionQuery,
} from "~/lib/collections";
import { genSecureToken } from "~/lib/secure-token";
import { createContactInputSchema } from "~/server-functions/contacts";
import { Button, EditInput } from "~/components/atoms";
import { useState } from "react";
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
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2">XXX</div>
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
