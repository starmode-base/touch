import { z } from "zod";

/**
 * Secure token schema
 */
export const SecureToken = z.string().regex(/^[0-9A-Za-z]{20}$/);
export type SecureToken = z.infer<typeof SecureToken>;
