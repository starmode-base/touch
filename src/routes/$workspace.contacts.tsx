import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SplitScreen } from "~/components/split-screen";
import { ContactsPanel } from "~/components/contacts-panel";
import { useContactsSync } from "~/collections/contacts-collection";

export const Route = createFileRoute("/$workspace/contacts")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  useContactsSync();
  const params = Route.useParams();

  return (
    <SplitScreen>
      <ContactsPanel workspaceId={params.workspace} />
      <Outlet />
    </SplitScreen>
  );
}
