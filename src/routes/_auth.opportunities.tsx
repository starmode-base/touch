import { createFileRoute, Outlet } from "@tanstack/react-router";
import invariant from "tiny-invariant";

export const Route = createFileRoute("/_auth/opportunities")({
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
  return <Outlet />;
}
