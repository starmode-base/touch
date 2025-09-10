import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/$workspace")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="bg-pattern-lines flex flex-1">
      <Outlet />
    </div>
  );
}
