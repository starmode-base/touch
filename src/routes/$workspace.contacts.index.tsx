import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace/contacts/")({
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-1 items-center justify-center">SIDE PANEL</div>
  );
}
