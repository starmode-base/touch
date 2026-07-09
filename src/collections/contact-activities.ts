import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import z from "zod";
import { queryClient } from "~/lib/query-client";
import { listContactActivitiesSF } from "~/server-functions/contact-activities";

/**
 * Contact activities collection
 */
export const contactActivitiesCollection = createCollection(
  queryCollectionOptions({
    id: "contact-activities",
    queryKey: ["contact-activities"],
    queryFn: () => listContactActivitiesSF(),
    queryClient,
    schema: z.object({
      id: z.string(),
      created_at: z.string(),
      updated_at: z.string(),
      user_id: z.string(),
      contact_id: z.string(),
      happened_at: z.string(),
      kind: z.string(),
      body: z.string(),
      details: z
        .object({
          name: z.string(),
          linkedin: z.string().nullable(),
        })
        .nullable(),
    }),
    getKey: (item) => item.id,
  }),
);
