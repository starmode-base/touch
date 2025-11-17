import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Toolbar } from "~/components/toolbar";
import metadata from "../../metadata.json";
import { SignInButton, SignUpButton } from "@clerk/tanstack-react-start";
import { Button } from "~/components/atoms";
import { syncViewerSF } from "~/server-functions/viewer";
import { useAutoUnlock } from "~/components/hooks/e2ee";

export const Route = createFileRoute("/_auth")({
  ssr: false,
  beforeLoad: async () => ({
    // Ensure the viewer is synced from Clerk to the database. This also makes
    // the viewer available as context in the loader of descendant routes.
    viewer: await syncViewerSF(),
  }),
  loader: ({ context }) => {
    return context;
  },
  component: RouteComponent,
});

function RouteComponent() {
  useAutoUnlock();
  const { viewer } = Route.useLoaderData();

  if (!viewer) {
    return (
      <div className="m-auto flex flex-col gap-4 rounded border border-slate-100 bg-white p-8">
        <div className="text-center text-4xl font-extrabold">
          {metadata.name}
        </div>
        <div className="max-w-xs text-center">{metadata.description}</div>
        <div className="m-auto flex gap-2">
          <SignInButton mode="modal">
            <Button>Sign in</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button>Sign up</Button>
          </SignUpButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toolbar />
      <Outlet />
    </>
  );
}
