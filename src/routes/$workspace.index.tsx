import { eq, useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { contactsCollection } from "~/lib/collections";
import { genSecureToken } from "~/lib/secure-token";
import { createContactSF } from "~/server-functions/contacts";

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
      <div className="flex gap-2 p-2">
        <Link
          className="h-fit w-fit rounded bg-sky-500 px-4 py-1 text-white"
          to="/"
        >
          Home
        </Link>
        <button
          className="h-fit w-fit rounded bg-sky-500 px-4 py-1 text-white"
          onClick={async () => {
            await createContact({
              data: {
                name: "Contact " + genSecureToken(3),
                linkedin: "https://linkedin.com/in/" + genSecureToken(3),
                workspaceId: params.workspace,
              },
            });
          }}
        >
          Create contact (RPC)
        </button>
        <button
          className="h-fit w-fit rounded bg-sky-500 px-4 py-1 text-white"
          onClick={() => {
            contactsCollection.insert({
              id: genSecureToken(),
              name: "Contact " + genSecureToken(3),
              linkedin: "https://linkedin.com/in/" + genSecureToken(3),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              workspace_id: params.workspace,
            });
          }}
        >
          Create contact (Sync)
        </button>
      </div>
      <div>
        {contacts.data.map((contact) => (
          <div key={contact.id} className="flex gap-2">
            <div
              role="button"
              onClick={() => {
                contactsCollection.update(contact.id, (draft) => {
                  draft.name = "Contact 2 " + genSecureToken(3);
                });
              }}
            >
              {contact.name}
            </div>
            <button
              onClick={() => {
                contactsCollection.delete(contact.id);
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
