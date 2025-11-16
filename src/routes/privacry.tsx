import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacry")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Privacy Policy</div>;
}
