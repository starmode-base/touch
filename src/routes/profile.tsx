import { createFileRoute, Outlet } from "@tanstack/react-router";
import invariant from "tiny-invariant";
import { E2eeGate } from "~/components/e2ee-gate";

export const Route = createFileRoute("/profile")({
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
  return (
    <E2eeGate>
      <Outlet />
    </E2eeGate>
  );
}
