import { createFileRoute } from "@tanstack/react-router";
import { proxyElectricRequest } from "~/lib/electric";

export const Route = createFileRoute("/api/workspaces")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return proxyElectricRequest({
          request,
          table: "workspaces",
          where: (viewer) => {
            return viewer.workspaceMembershipIds.length
              ? `id IN (${viewer.workspaceMembershipIds.map((id) => `'${id}'`).join(",")})`
              : `FALSE`;
          },
        });
      },
    },
  },
});
