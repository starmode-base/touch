import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "~/lib/query-client";
import { listContactRolesSF } from "~/server-functions/contact-roles";
import { selectContactRoleSchema } from "~/postgres/validation";

/**
 * Contact roles collection
 */
export const contactRolesCollection = createCollection(
  queryCollectionOptions({
    id: "contact-roles",
    queryKey: ["contact-roles"],
    queryFn: () => listContactRolesSF(),
    queryClient,
    // Only sync in the browser: during SSR there is no Start context for
    // server-function RPC calls
    enabled: typeof window !== "undefined",
    schema: selectContactRoleSchema,
    getKey: (item) => item.id,
  }),
);
