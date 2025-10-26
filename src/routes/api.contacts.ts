import { createFileRoute } from "@tanstack/react-router";
import { proxyElectricRequest } from "~/lib/electric";

const serve = (args: { request: Request }) => {
  return proxyElectricRequest({
    request: args.request,
    table: "contacts",
    where: (viewer) => {
      return viewer.workspaceMembershipIds.length
        ? `workspace_id IN (${viewer.workspaceMembershipIds.map((id) => `'${id}'`).join(",")})`
        : `FALSE`;
    },
  });
};

export const Route = createFileRoute("/api/contacts")({
  server: { handlers: { GET: serve } },
});
