import { createCollection } from "@tanstack/react-db";
import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import z from "zod";

/**
 * Contact activities collection (Electric)
 */
export const contactActivitiesCollection = createCollection(
  electricCollectionOptions({
    id: "contact-activities-electric",
    schema: z.object({
      id: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
      user_id: z.string(),
      contact_id: z.string(),
      happened_at: z.string(),
      kind: z.string(),
      body: z.string(),
      details: z.object({
        name: z.string(),
        linkedin: z.string().nullable(),
      }),
    }),
    getKey: (item) => item.id,
    shapeOptions: {
      url: new URL(
        `/api/contact-activities`,
        window.location.origin,
      ).toString(),
    },
  }),
);
