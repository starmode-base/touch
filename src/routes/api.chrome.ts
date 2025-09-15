/**
 * API route for the Chrome extension
 */
import { createServerFileRoute } from "@tanstack/react-start/server";
import {
  upsertContactInputSchema,
  upsertContactSF,
} from "~/server-functions/contacts";

export const ServerRoute = createServerFileRoute("/api/chrome").methods({
  POST: async ({ request }) => {
    const result = await upsertContactSF({
      data: upsertContactInputSchema.parse(await request.json()),
    });

    return Response.json(result);
  },
});
