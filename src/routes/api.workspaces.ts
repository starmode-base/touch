import { createServerFileRoute } from "@tanstack/react-start/server";
import { proxyElectricShape } from "~/lib/electric";

export const ServerRoute = createServerFileRoute("/api/workspaces").methods({
  GET: async ({ request }) => {
    return proxyElectricShape({
      request,
      table: "workspaces",
      where: (viewer) => {
        return viewer.workspaceMembershipIds.length
          ? `id IN (${viewer.workspaceMembershipIds.map((id) => `'${id}'`).join(",")})`
          : `FALSE`;
      },
    });
  },
});
