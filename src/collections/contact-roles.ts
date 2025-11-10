import { electricCollectionOptions } from "@tanstack/electric-db-collection";
import { createCollection } from "@tanstack/react-db";
import z from "zod";

/**
 * Contact roles collection (Electric)
 */

export const contactRolesCollection = createCollection(
  electricCollectionOptions({
    id: "contact-roles-electric",
    schema: z.object({
      id: z.string(),
      key: z.string(),
      name: z.string(),
      user_id: z.string(),
    }),
    getKey: (item) => item.id,
    shapeOptions: {
      url: new URL(`/api/contact-roles`, window.location.origin).toString(),
    },
  }),
);
