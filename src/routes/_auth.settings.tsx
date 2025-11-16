import { createFileRoute, Outlet } from "@tanstack/react-router";
import { E2eeGate2 } from "~/components/e2ee-gate";

export const Route = createFileRoute("/_auth/settings")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <E2eeGate2>
      <Outlet />
    </E2eeGate2>
  );
}
