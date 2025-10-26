import { createFileRoute } from "@tanstack/react-router";
import { proxyElectricRequest } from "~/lib/electric";

export const Route = createFileRoute("/api/contact-activities")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return proxyElectricRequest({
          request,
          table: "contact_activities",
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
