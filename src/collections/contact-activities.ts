import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "~/lib/query-client";
import { listContactActivitiesSF } from "~/server-functions/contact-activities";
import { selectContactActivitySchema } from "~/postgres/validation";

/**
 * Contact activities collection
 */
export const contactActivitiesCollection = createCollection(
  queryCollectionOptions({
    id: "contact-activities",
    queryKey: ["contact-activities"],
    queryFn: () => listContactActivitiesSF(),
    queryClient,
    // Only sync in the browser: during SSR there is no Start context for
    // server-function RPC calls
    enabled: typeof window !== "undefined",
    schema: selectContactActivitySchema,
    getKey: (item) => item.id,
  }),
);
