import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import z from "zod";
import { queryClient } from "~/lib/query-client";
import { listContactRolesSF } from "~/server-functions/contact-roles";

/**
 * Contact roles collection
 */
export const contactRolesCollection = createCollection(
  queryCollectionOptions({
    id: "contact-roles",
    queryKey: ["contact-roles"],
    queryFn: () => listContactRolesSF(),
    queryClient,
    schema: z.object({
      id: z.string(),
      key: z.string(),
      name: z.string(),
      user_id: z.string(),
    }),
    getKey: (item) => item.id,
  }),
);
