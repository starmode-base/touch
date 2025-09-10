import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/contacts/$contact")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/$workspace/contacts/$contact"!</div>;
}
