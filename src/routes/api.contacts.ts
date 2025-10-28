import { createFileRoute } from "@tanstack/react-router";
import { proxyElectricRequest } from "~/lib/electric";

const serve = (args: { request: Request }) => {
  return proxyElectricRequest({
    request: args.request,
    table: "contacts",
    where: (viewer) => {
      return `user_id = '${viewer.id}'`;
    },
  });
};

export const Route = createFileRoute("/api/contacts")({
  server: { handlers: { GET: serve } },
});
