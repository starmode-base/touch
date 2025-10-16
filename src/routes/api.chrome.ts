/**
 * API route for the Chrome extension
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  upsertContactInputSchema,
  upsertContactSF,
} from "~/server-functions/contacts";

export const Route = createFileRoute("/api/chrome")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const result = await upsertContactSF({
          data: upsertContactInputSchema.parse(await request.json()),
        });

        return Response.json(result);
      },
    },
  },
});
