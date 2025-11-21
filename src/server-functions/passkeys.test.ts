import { describe, test, expect } from "vitest";
import { deletePasskey } from "./passkeys";
import { withNeonTestBranch } from "~/testing/neon-testing";
import { db, schema } from "~/postgres/db";
import { eq } from "drizzle-orm";

withNeonTestBranch();

describe("deletePasskey", () => {
  test("user with zero passkeys can delete zero ids", async () => {
    // Setup: Create a user with no passkeys
    const [user] = await db()
      .insert(schema.users)
      .values({
        email: "ripley@weyland-yutani.com",
        clerk_user_id: "ripley_001",
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    // Act: Delete zero ids
    const txid = await deletePasskey([], user.id);

    // Assert: Operation succeeds (nothing to delete)
    expect(txid).toBeDefined();

    const passkeys = await db()
      .select()
      .from(schema.passkeys)
      .where(eq(schema.passkeys.user_id, user.id));
    expect(passkeys).toHaveLength(0);
  });

  test("user with one passkey cannot delete it", async () => {
    // Setup: Create a user with exactly one passkey
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

    const [passkey] = await db()
      .insert(schema.passkeys)
      .values({
        user_id: user.id,
        credential_id: "cred_001",
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

    // Act & Assert: Attempt to delete the only passkey should fail
    await expect(deletePasskey([passkey.id], user.id)).rejects.toThrow(
      "Cannot delete the last passkey",
    );

    // Verify: Passkey still exists
    const passkeys = await db()
      .select()
      .from(schema.passkeys)
      .where(eq(schema.passkeys.user_id, user.id));
    expect(passkeys).toHaveLength(1);
    expect(passkeys[0]?.id).toBe(passkey.id);
  });

  test("user with two passkeys can delete one", async () => {
    // Setup: Create a user with two passkeys
    const [user] = await db()
      .insert(schema.users)
      .values({
        email: "newt@hadleys-hope.lv-426",
        clerk_user_id: "newt_001",
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    const [passkey1, passkey2] = await db()
      .insert(schema.passkeys)
      .values([
        {
          user_id: user.id,
          credential_id: "cred_newt_001",
          public_key: "public_key_newt_001",
          wrapped_dek: "wrapped_dek_newt_001",
          kek_salt: "kek_salt_newt_001",
          transports: ["internal"],
          algorithm: -7,
          rp_name: "Touch",
          rp_id: "localhost",
          webauthn_user_id: "webauthn_newt_001",
          webauthn_user_name: "Newt",
          webauthn_user_display_name: "Rebecca Jorden",
        },
        {
          user_id: user.id,
          credential_id: "cred_newt_002",
          public_key: "public_key_newt_002",
          wrapped_dek: "wrapped_dek_newt_002",
          kek_salt: "kek_salt_newt_002",
          transports: ["hybrid"],
          algorithm: -7,
          rp_name: "Touch",
          rp_id: "localhost",
          webauthn_user_id: "webauthn_newt_002",
          webauthn_user_name: "Newt",
          webauthn_user_display_name: "Rebecca Jorden",
        },
      ])
      .returning();

    if (!passkey1 || !passkey2) {
      throw new Error("Failed to create passkeys");
    }

    // Act: Delete one passkey
    const txid = await deletePasskey([passkey1.id], user.id);

    // Assert: Operation succeeds, one passkey remains
    expect(txid).toBeDefined();

    const passkeys = await db()
      .select()
      .from(schema.passkeys)
      .where(eq(schema.passkeys.user_id, user.id));
    expect(passkeys).toHaveLength(1);
    expect(passkeys[0]?.id).toBe(passkey2.id);
  });

  test("user with two passkeys cannot delete both", async () => {
    // Setup: Create a user with exactly two passkeys
    const [user] = await db()
      .insert(schema.users)
      .values({
        email: "bishop@synthetics.weyland-yutani.com",
        clerk_user_id: "bishop_001",
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    const [passkey1, passkey2] = await db()
      .insert(schema.passkeys)
      .values([
        {
          user_id: user.id,
          credential_id: "cred_bishop_001",
          public_key: "public_key_bishop_001",
          wrapped_dek: "wrapped_dek_bishop_001",
          kek_salt: "kek_salt_bishop_001",
          transports: ["internal"],
          algorithm: -7,
          rp_name: "Touch",
          rp_id: "localhost",
          webauthn_user_id: "webauthn_bishop_001",
          webauthn_user_name: "Bishop",
          webauthn_user_display_name: "Bishop (Android)",
        },
        {
          user_id: user.id,
          credential_id: "cred_bishop_002",
          public_key: "public_key_bishop_002",
          wrapped_dek: "wrapped_dek_bishop_002",
          kek_salt: "kek_salt_bishop_002",
          transports: ["hybrid"],
          algorithm: -7,
          rp_name: "Touch",
          rp_id: "localhost",
          webauthn_user_id: "webauthn_bishop_002",
          webauthn_user_name: "Bishop",
          webauthn_user_display_name: "Bishop (Android)",
        },
      ])
      .returning();

    if (!passkey1 || !passkey2) {
      throw new Error("Failed to create passkeys");
    }

    // Act & Assert: Attempt to delete both passkeys should fail
    await expect(
      deletePasskey([passkey1.id, passkey2.id], user.id),
    ).rejects.toThrow("Cannot delete the last passkey");

    // Verify: Both passkeys still exist
    const passkeys = await db()
      .select()
      .from(schema.passkeys)
      .where(eq(schema.passkeys.user_id, user.id));
    expect(passkeys).toHaveLength(2);
  });

  test("user with three passkeys can delete two", async () => {
    // Setup: Create a user with three passkeys
    const [user] = await db()
      .insert(schema.users)
      .values({
        email: "hudson@colonial-marines.mil",
        clerk_user_id: "hudson_001",
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user");
    }

    const [passkey1, passkey2, passkey3] = await db()
      .insert(schema.passkeys)
      .values([
        {
          user_id: user.id,
          credential_id: "cred_hudson_001",
          public_key: "public_key_hudson_001",
          wrapped_dek: "wrapped_dek_hudson_001",
          kek_salt: "kek_salt_hudson_001",
          transports: ["internal"],
          algorithm: -7,
          rp_name: "Touch",
          rp_id: "localhost",
          webauthn_user_id: "webauthn_hudson_001",
          webauthn_user_name: "Hudson",
          webauthn_user_display_name: "William Hudson",
        },
        {
          user_id: user.id,
          credential_id: "cred_hudson_002",
          public_key: "public_key_hudson_002",
          wrapped_dek: "wrapped_dek_hudson_002",
          kek_salt: "kek_salt_hudson_002",
          transports: ["hybrid"],
          algorithm: -7,
          rp_name: "Touch",
          rp_id: "localhost",
          webauthn_user_id: "webauthn_hudson_002",
          webauthn_user_name: "Hudson",
          webauthn_user_display_name: "William Hudson",
        },
        {
          user_id: user.id,
          credential_id: "cred_hudson_003",
          public_key: "public_key_hudson_003",
          wrapped_dek: "wrapped_dek_hudson_003",
          kek_salt: "kek_salt_hudson_003",
          transports: ["usb"],
          algorithm: -7,
          rp_name: "Touch",
          rp_id: "localhost",
          webauthn_user_id: "webauthn_hudson_003",
          webauthn_user_name: "Hudson",
          webauthn_user_display_name: "William Hudson",
        },
      ])
      .returning();

    if (!passkey1 || !passkey2 || !passkey3) {
      throw new Error("Failed to create passkeys");
    }

    // Act: Delete two passkeys
    const txid = await deletePasskey([passkey1.id, passkey2.id], user.id);

    // Assert: Operation succeeds, one passkey remains
    expect(txid).toBeDefined();

    const passkeys = await db()
      .select()
      .from(schema.passkeys)
      .where(eq(schema.passkeys.user_id, user.id));
    expect(passkeys).toHaveLength(1);
    expect(passkeys[0]?.id).toBe(passkey3.id);
  });
});
