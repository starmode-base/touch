import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SplitScreen } from "#components/split-screen";
import { ContactsPanel } from "#components/contacts-panel";
import invariant from "tiny-invariant";
import { contactsStore } from "#collections/contacts";
import { contactRolesCollection } from "#collections/contact-roles";
import { contactRoleAssignmentsCollection } from "#collections/contact-role-assignments";

export const Route = createFileRoute("/_auth/contacts")({
  component: RouteComponent,
  loader: async ({ context }) => {
    // Wait for the collections this route renders so navigations don't show
    // an empty flash. Client only: during SSR collection sync is disabled and
    // preload would never resolve. Signed-in only: the queryFn server
    // functions reject for signed-out visitors (who get the sign-in screen).
    if (typeof window !== "undefined" && context.viewer) {
      await Promise.all([
        contactsStore.preload(),
        contactRolesCollection.preload(),
        contactRoleAssignmentsCollection.preload(),
      ]);
    }

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
