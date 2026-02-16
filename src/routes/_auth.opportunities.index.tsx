import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/opportunities/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div className="m-auto p-4">Opportunities (TBD)</div>;
}
