import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SplitScreen } from "~/components/split-screen";
import { Contacts } from "~/components/contacts";

export const Route = createFileRoute("/$workspace/contacts")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();

  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-purple-500">
      <SplitScreen>
        <Contacts workspaceId={params.workspace} />
        <Outlet />
      </SplitScreen>
    </div>
  );
}
