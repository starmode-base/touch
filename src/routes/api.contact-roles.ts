import { createServerFileRoute } from "@tanstack/react-start/server";
import { proxyElectricShape } from "~/lib/electric";

export const ServerRoute = createServerFileRoute("/api/contact-roles").methods({
  GET: async ({ request }) => {
    return proxyElectricShape({
      request,
      table: "contact_roles",
      where: (viewer) => {
        return viewer.workspaceMembershipIds.length
          ? `workspace_id IN (${viewer.workspaceMembershipIds.map((id) => `'${id}'`).join(",")})`
          : `FALSE`;
      },
    });
  },
});
