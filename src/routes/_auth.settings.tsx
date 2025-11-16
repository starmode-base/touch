import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/settings")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
