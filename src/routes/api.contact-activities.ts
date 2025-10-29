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
            // Safe: viewer.id is alphanumeric-only token from gen_secure_token()
            return `user_id = '${viewer.id}'`;
          },
        });
      },
    },
  },
});
