import { db, schema } from "~/postgres/db";
import { genSecureToken } from "~/lib/secure-token";

/**
 * Helper: Creates a synchronization barrier for N participants
 *
 * @param count - The number of participants
 * @returns A function that can be called to wait for all participants to arrive
 */
export function createBarrier(count: number) {
  let arrived = 0;
  const waiters: (() => void)[] = [];

  return async () => {
    arrived++;

    if (arrived === count) {
      waiters.forEach((resolve) => {
        resolve();
      });
    } else {
      await new Promise<void>((resolve) => waiters.push(resolve));
    }
  };
}

export async function seedUser() {
  const [user] = await db()
    .insert(schema.users)
    .values({
      email: "hicks@colonial-marines.mil",
      clerk_user_id: "hicks_001",
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

export async function seedPasskey(userId: string) {
  const [passkey] = await db()
    .insert(schema.passkeys)
    .values({
      user_id: userId,
      credential_id: genSecureToken(),
      public_key: "public_key_001",
      wrapped_dek: "wrapped_dek_001",
      kek_salt: "kek_salt_001",
      transports: ["internal"],
      algorithm: -7,
      rp_name: "Touch",
      rp_id: "localhost",
      webauthn_user_id: "webauthn_user_001",
      webauthn_user_name: "Hicks",
      webauthn_user_display_name: "Dwayne Hicks",
    })
    .returning();

  if (!passkey) {
    throw new Error("Failed to create passkey");
  }

  return passkey;
}
