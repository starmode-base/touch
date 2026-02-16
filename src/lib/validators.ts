import { z } from "zod";
import { linkedinPatternExact } from "./linkedin-extractor";

/**
 * Secure token schema
 */
export const SecureToken = z.stringFormat("secure-token", /^[0-9A-Za-z]{20}$/);
export type SecureToken = z.infer<typeof SecureToken>;

/**
 * Contact name schema
 */
export const ContactName = z.string().trim().nonempty().max(64);
export type ContactName = z.infer<typeof ContactName>;

/**
 * Encrypted contact name schema
 *
 * Encrypted name: base64url(12-byte IV + ciphertext + 16-byte auth tag)
 * Max ~200 chars to accommodate encryption overhead
 */
export const ContactNameEncrypted = z.base64url().max(200);
export type ContactNameEncrypted = z.infer<typeof ContactNameEncrypted>;

/**
 * LinkedIn URL schema
 */
export const LinkedInUrl = z
  .string()
  .trim()
  .regex(linkedinPatternExact)
  .max(64);
export type LinkedInUrl = z.infer<typeof LinkedInUrl>;
