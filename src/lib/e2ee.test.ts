import { describe, test, expect, beforeEach } from "vitest";
import {
  generateDek,
  encryptField,
  decryptField,
  setGlobalDek,
  getGlobalDek,
  clearGlobalDek,
  hasGlobalDek,
} from "./e2ee";

describe("generateDek", () => {
  test("generates 32-byte DEK", () => {
    const dek = generateDek();
    expect(dek).toBeInstanceOf(Uint8Array);
    expect(dek.byteLength).toBe(32);
  });

  test("generates unique DEKs on each call", () => {
    const dek1 = generateDek();
    const dek2 = generateDek();
    expect(dek1).not.toEqual(dek2);
  });
});

describe("encryptField and decryptField", () => {
  let dek: Uint8Array;

  beforeEach(() => {
    dek = generateDek();
  });

  test("roundtrip encryption and decryption returns original plaintext", async () => {
    const plaintext = "Alice Smith";
    const encrypted = await encryptField(plaintext, dek);
    const decrypted = await decryptField(encrypted, dek);

    expect(decrypted).toBe(plaintext);
  });

  test("encrypted value is base64url string", async () => {
    const plaintext = "Bob Jones";
    const encrypted = await encryptField(plaintext, dek);

    // base64url uses: A-Z, a-z, 0-9, -, _
    expect(encrypted).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encrypted.length).toBeGreaterThan(plaintext.length);
  });

  test("encrypted value never contains padding", async () => {
    // Test with various plaintext lengths that would produce padding if using standard base64
    const plaintexts = [
      "a", // 1 byte
      "ab", // 2 bytes
      "abcde", // 5 bytes
      "Alice Smith",
      "Bob Jones",
    ];

    for (const plaintext of plaintexts) {
      const encrypted = await encryptField(plaintext, dek);
      // Verify no padding characters are present
      expect(encrypted).not.toContain("=");
    }
  });

  test("encrypting same plaintext twice produces different ciphertext", async () => {
    const plaintext = "Charlie Brown";
    const encrypted1 = await encryptField(plaintext, dek);
    const encrypted2 = await encryptField(plaintext, dek);

    // Random IV makes each encryption unique
    expect(encrypted1).not.toBe(encrypted2);

    // But both decrypt to same plaintext
    expect(await decryptField(encrypted1, dek)).toBe(plaintext);
    expect(await decryptField(encrypted2, dek)).toBe(plaintext);
  });

  test("decryption fails with wrong DEK", async () => {
    const plaintext = "Diana Prince";
    const encrypted = await encryptField(plaintext, dek);

    const wrongDek = generateDek();

    await expect(decryptField(encrypted, wrongDek)).rejects.toThrow();
  });

  test("decryption fails with corrupted ciphertext", async () => {
    const plaintext = "Ellen Ripley";
    const encrypted = await encryptField(plaintext, dek);

    // Corrupt the ciphertext
    const corrupted = encrypted.slice(0, -5) + "XXXXX";

    await expect(decryptField(corrupted, dek)).rejects.toThrow();
  });

  test("handles empty string", async () => {
    const plaintext = "";
    const encrypted = await encryptField(plaintext, dek);
    const decrypted = await decryptField(encrypted, dek);

    expect(decrypted).toBe("");
  });

  test("handles unicode characters", async () => {
    const plaintext = "José García 你好 🚀";
    const encrypted = await encryptField(plaintext, dek);
    const decrypted = await decryptField(encrypted, dek);

    expect(decrypted).toBe(plaintext);
  });

  test("handles long strings", async () => {
    const plaintext = "a".repeat(1000);
    const encrypted = await encryptField(plaintext, dek);
    const decrypted = await decryptField(encrypted, dek);

    expect(decrypted).toBe(plaintext);
  });

  test("throws error if DEK is not 32 bytes (encrypt)", async () => {
    const shortDek = new Uint8Array(16);
    await expect(encryptField("test", shortDek)).rejects.toThrow(
      "DEK must be 32 bytes",
    );
  });

  test("throws error if DEK is not 32 bytes (decrypt)", async () => {
    const encrypted = await encryptField("test", dek);
    const shortDek = new Uint8Array(16);
    await expect(decryptField(encrypted, shortDek)).rejects.toThrow(
      "DEK must be 32 bytes",
    );
  });
});

describe("global DEK management", () => {
  beforeEach(() => {
    // Clear DEK before each test
    clearGlobalDek();
  });

  test("initially no DEK is set", () => {
    expect(hasGlobalDek()).toBe(false);
    expect(() => getGlobalDek()).toThrow("DEK not available");
  });

  test("can set and get DEK", () => {
    const dek = generateDek();
    setGlobalDek(dek);

    expect(hasGlobalDek()).toBe(true);
    expect(getGlobalDek()).toEqual(dek);
  });

  test("can clear DEK", () => {
    const dek = generateDek();
    setGlobalDek(dek);
    expect(hasGlobalDek()).toBe(true);

    clearGlobalDek();
    expect(hasGlobalDek()).toBe(false);
    expect(() => getGlobalDek()).toThrow("DEK not available");
  });

  test("throws error if setting DEK that is not 32 bytes", () => {
    const shortDek = new Uint8Array(16);
    expect(() => {
      setGlobalDek(shortDek);
    }).toThrow("DEK must be 32 bytes");
  });

  test("setting new DEK overwrites previous DEK", () => {
    const dek1 = generateDek();
    const dek2 = generateDek();

    setGlobalDek(dek1);
    expect(getGlobalDek()).toEqual(dek1);

    setGlobalDek(dek2);
    expect(getGlobalDek()).toEqual(dek2);
    expect(getGlobalDek()).not.toEqual(dek1);
  });
});

describe("integration: encrypt with global DEK", () => {
  beforeEach(() => {
    clearGlobalDek();
  });

  test("can encrypt and decrypt using global DEK", async () => {
    const dek = generateDek();
    setGlobalDek(dek);

    const plaintext = "Amanda Ripley";
    const encrypted = await encryptField(plaintext, getGlobalDek());
    const decrypted = await decryptField(encrypted, getGlobalDek());

    expect(decrypted).toBe(plaintext);
  });

  test("encryption fails if global DEK not set", () => {
    expect(() => getGlobalDek()).toThrow("DEK not available");
  });
});
