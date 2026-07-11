import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Toolbar } from "~/components/toolbar";
import metadata from "../../metadata.json";
import { SignInButton, SignUpButton } from "@clerk/tanstack-react-start";
import { Button } from "~/components/atoms";
import { syncViewerSF } from "~/server-functions/viewer";
import { E2eeProvider } from "~/components/hooks/e2ee";
import { passkeysCollection } from "~/collections/passkeys";

export const Route = createFileRoute("/_auth")({
  // Run beforeLoad/loader on the server during the initial request so the
  // viewer is resolved without a client round-trip. Full SSR is not possible:
  // useLiveQuery cannot render on the server (no getServerSnapshot in
  // @tanstack/react-db), so components stay client-rendered.
  ssr: "data-only",
  beforeLoad: async () => ({
    // Ensure the viewer is synced from Clerk to the database. This also makes
    // the viewer available as context in the loader of descendant routes.
    viewer: await syncViewerSF(),
  }),
  loader: async ({ context }) => {
    // Passkeys are needed app-wide (session unlock, settings). Client only:
    // during SSR collection sync is disabled and preload would never resolve.
    // Signed-in only: the queryFn server function rejects for signed-out
    // visitors (who get the sign-in screen).
    if (typeof window !== "undefined" && context.viewer) {
      await passkeysCollection.preload();
    }

    return context;
  },
  component: RouteComponent,
});

function RouteComponent() {
  // useAutoUnlock();
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
      <E2eeProvider>
        <Toolbar />
        <Outlet />
      </E2eeProvider>
    </>
  );
}
