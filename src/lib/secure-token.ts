import { customAlphabet } from "nanoid";
import z from "zod";

const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const lowercase = "abcdefghijklmnopqrstuvwxyz";
const numbers = "0123456789";
const alphanumeric = numbers + lowercase + uppercase;

/**
 * Generates a random base62 (alphanumeric) string. By default generates a
 * string of length 20, but accepts an optional size parameter to generate a
 * different length.
 *
 * The generated tokens are both collision-resistant and unpredictable, making
 * them suitable for use as both unique IDs and secrets.
 */
export const genSecureToken = customAlphabet(alphanumeric, 20);

export const SecureToken = z.string().regex(/^[0-9A-Za-z]{20}$/);
export type SecureToken = z.infer<typeof SecureToken>;
