import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SplitScreen } from "~/components/split-screen";
import { ContactsPanel } from "~/components/contacts-panel";
import invariant from "tiny-invariant";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_auth/contacts")({
  ssr: false,
  component: RouteComponent,
  loader: async () => {
    const t = performance.now();
    const { data: session } = await authClient.getSession();
    invariant(session, "Session not found");
    const t2 = performance.now();
    console.log(`Time to get session: ${t2 - t}ms`);

    return {
      viewer: session.user,
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
