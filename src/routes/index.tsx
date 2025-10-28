import { createFileRoute } from "@tanstack/react-router";
import { LinkButton } from "~/components/atoms";
import { AppHeader } from "~/components/app-header";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return (
    <>
      <AppHeader>
        <LinkButton to="/">Home</LinkButton>
        <LinkButton to="/demo">Demo</LinkButton>
      </AppHeader>
      <div className="grid flex-1 gap-4 p-4">
        <div className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-4">
          <div className="text-lg font-medium">Workspaces</div>
          11
        </div>
      </div>
    </>
  );
}
