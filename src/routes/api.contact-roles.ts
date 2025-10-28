import { createFileRoute } from "@tanstack/react-router";
import { proxyElectricRequest } from "~/lib/electric";

export const Route = createFileRoute("/api/contact-roles")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return proxyElectricRequest({
          request,
          table: "contact_roles",
          where: (viewer) => {
            return `user_id = '${viewer.id}'`;
          },
        });
      },
    },
  },
});
