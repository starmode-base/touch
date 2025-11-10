import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SplitScreen } from "~/components/split-screen";
import { ContactsPanel } from "~/components/contacts-panel";
import invariant from "tiny-invariant";
import { E2eeGate } from "~/components/e2ee-gate";

export const Route = createFileRoute("/contacts")({
  ssr: false,
  component: RouteComponent,
  loader: ({ context }) => {
    invariant(context.viewer, "Viewer not found");

    return {
      viewer: context.viewer,
    };
  },
});

function RouteComponent() {
  const { viewer } = Route.useLoaderData();

  return (
    <E2eeGate>
      <SplitScreen>
        <ContactsPanel userId={viewer.id} />
        <Outlet />
      </SplitScreen>
    </E2eeGate>
  );
}
