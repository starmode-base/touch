import { createFileRoute } from "@tanstack/react-router";
import { proxyElectricRequest } from "~/lib/electric";

const serve = (args: { request: Request }) => {
  return proxyElectricRequest({
    request: args.request,
    table: "contacts",
    where: (viewer) => {
      // Safe: viewer.id is alphanumeric-only token from gen_secure_token()
      return `user_id = '${viewer.id}'`;
    },
  });
};

export const Route = createFileRoute("/api/contacts")({
  server: { handlers: { GET: serve } },
});
