import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SplitScreen } from "~/components/split-screen";
import { ContactsPanel } from "~/components/contacts-panel";
import invariant from "tiny-invariant";

export const Route = createFileRoute("/$workspace/contacts")({
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
    <SplitScreen>
      <ContactsPanel userId={viewer.id} />
      <Outlet />
    </SplitScreen>
  );
}
