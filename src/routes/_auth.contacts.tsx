import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SplitScreen } from "~/components/split-screen";
import { ContactsPanel } from "~/components/contacts-panel";
import invariant from "tiny-invariant";

export const Route = createFileRoute("/_auth/contacts")({
  component: RouteComponent,
  loader: ({ context }) => {
    return {
      viewer: context.viewer,
    };
  },
});

function RouteComponent() {
  const { viewer } = Route.useLoaderData();

  // The loader also runs for signed-out visitors (the parent shows the
  // sign-in screen instead of the outlet), so the viewer is only guaranteed
  // here, not in the loader
  invariant(viewer, "Viewer not found");

  return (
    <SplitScreen>
      <ContactsPanel userId={viewer.id} />
      <Outlet />
    </SplitScreen>
  );
}
