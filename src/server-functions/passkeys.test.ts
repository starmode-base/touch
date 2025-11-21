import { describe, test, expect, beforeEach } from "vitest";
import { deletePasskey } from "./passkeys";
import { withNeonTestBranch } from "~/testing/neon-testing";
import { db, schema } from "~/postgres/db";
import { eq } from "drizzle-orm";
import { seedPasskey, seedUser } from "~/testing/test-helpers";

/**
 * Enable Neon Postgres integration tests
 */
withNeonTestBranch();

/**
 * Deleting users is sufficient since the delete cascades to all other tables
 */
beforeEach(async () => {
  await db().delete(schema.users);
});

describe("deletePasskey", () => {
  test("user with zero passkeys can delete zero ids", async () => {
    // Setup: Create a user with no passkeys
    const user = await seedUser();

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
    const user = await seedUser();
    const passkey = await seedPasskey(user.id);

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
    const user = await seedUser();
    const passkey1 = await seedPasskey(user.id);
    const passkey2 = await seedPasskey(user.id);

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
    const user = await seedUser();
    const passkey1 = await seedPasskey(user.id);
    const passkey2 = await seedPasskey(user.id);

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
    const user = await seedUser();
    const passkey1 = await seedPasskey(user.id);
    const passkey2 = await seedPasskey(user.id);
    const passkey3 = await seedPasskey(user.id);

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
