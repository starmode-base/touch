import { createFileRoute } from "@tanstack/react-router";
import { proxyElectricShape } from "~/lib/electric";

export const Route = createFileRoute("/api/contact-role-assignments")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return proxyElectricShape({
          request,
          table: "contact_role_assignments",
          where: (viewer) => {
            return viewer.workspaceMembershipIds.length
              ? `workspace_id IN (${viewer.workspaceMembershipIds.map((id) => `'${id}'`).join(",")})`
              : `FALSE`;
          },
        });
      },
    },
  },
});
