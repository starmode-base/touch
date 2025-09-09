import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { contactsCollection } from "~/lib/collections";
import { genSecureToken } from "~/lib/secure-token";
import { createContactSF } from "~/server-functions/contacts";
import { Button } from "~/components/atoms";

export const Route = createFileRoute("/$workspace/")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  const createContact = useServerFn(createContactSF);
  const params = Route.useParams();

  const contacts = useLiveQuery((q) => {
    return q
      .from({ contact: contactsCollection })
      .where(({ contact }) => eq(contact.workspace_id, params.workspace))
      .orderBy(({ contact }) => contact.created_at, "desc")
      .orderBy(({ contact }) => contact.id, "desc");
  });

  return (
    <div>
      <div className="flex gap-2 rounded p-4 px-6">
        <Button
          onClick={async () => {
            await createContact({
              data: {
                name: "Contact " + genSecureToken(6),
                linkedin: "https://linkedin.com/in/" + genSecureToken(3),
                workspaceId: params.workspace,
              },
            });
          }}
        >
          Create contact (RPC)
        </Button>
        <Button
          onClick={() => {
            contactsCollection.insert({
              id: genSecureToken(),
              name: "Contact " + genSecureToken(6),
              linkedin: "https://linkedin.com/in/" + genSecureToken(3),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              workspace_id: params.workspace,
            });
          }}
        >
          Create contact (Tanstack DB/Electric)
        </Button>
      </div>
      <div className="flex flex-col gap-1 p-2">
        {contacts.data.map((contact) => (
          <div
            key={contact.id}
            className="flex gap-2 rounded border border-slate-200 bg-white p-4"
          >
            <Button
              onClick={() => {
                contactsCollection.delete(contact.id);
              }}
            >
              Delete
            </Button>
            <Button
              onClick={() => {
                contactsCollection.update(contact.id, (draft) => {
                  draft.name = "Contact " + genSecureToken(6);
                });
              }}
            >
              Update
            </Button>
            <div>{contact.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
