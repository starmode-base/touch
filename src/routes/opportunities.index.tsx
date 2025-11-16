import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/opportunities/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/opportunities/"!</div>;
}
