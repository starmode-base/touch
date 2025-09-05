import { describe, test, expect } from "vitest";
import { buildWorkspaceGuards } from "./auth-middleware";

/** Test data setup */
const {
  isInWorkspace,
  hasWorkspaceRole,
  ensureIsInWorkspace,
  ensureHasWorkspaceRole,
} = buildWorkspaceGuards([
  { workspaceId: "1", role: "member" },
  { workspaceId: "2", role: "administrator" },
  { workspaceId: "3", role: "member" },
  { workspaceId: "4", role: "administrator" },
]);

// A list of base types to test type safety
const baseTypes: unknown[] = [
  null,
  undefined,
  true,
  false,
  {},
  [],
  "",
  " ",
  NaN,
  0,
  1,
  Date(),
  new Date(),
];

// Test data
const invalidWorkspaceIds: unknown[] = [
  ...baseTypes,
  ...baseTypes.map((value) => [value]),
  ...baseTypes.map((value) => ["1", value]),
];

// Test data
const invalidRoles: unknown[] = [...baseTypes, "invalid role"];

/**
 * isInWorkspace test cases
 */
interface IsInWorkspaceTestCase {
  input: string | string[];
  expected: boolean;
  label: string;
}

const invalidIdsTestCases = invalidWorkspaceIds.map((value) => ({
  input: value as string | string[],
  expected: false,
  label: Array.isArray(value)
    ? `invalid array input: ${JSON.stringify(value)}`
    : `invalid input: ${String(value)}`,
})) as IsInWorkspaceTestCase[];

const isInWorkspaceTestCases: IsInWorkspaceTestCase[] = [
  // Success cases
  { input: "1", expected: true, label: "string id present" },
  { input: ["1"], expected: true, label: "single-item array present" },
  { input: "2", expected: true, label: "string id present (other)" },
  { input: ["2"], expected: true, label: "single-item array present (other)" },
  { input: ["1", "3"], expected: true, label: "multiple items all present" },
  // Failure cases
  { input: ["1", "5"], expected: false, label: "one present, one missing" },
  { input: ["5"], expected: false, label: "non-existent workspace" },
  { input: [], expected: false, label: "empty array returns false" },
  { input: "", expected: false, label: "empty string returns false" },
  ...invalidIdsTestCases,
];

/**
 * hasWorkspaceRole test cases
 */
interface HasWorkspaceRoleTestCase {
  input: [string | string[], "member" | "administrator"];
  expected: boolean;
  label: string;
}

const invalidRoleTestCases = invalidRoles.map((role) => ({
  input: ["1", role],
  expected: false,
  label: `invalid role: ${String(role)}`,
})) as HasWorkspaceRoleTestCase[];

const adminRoleFailureTestCases = invalidWorkspaceIds.map((workspaceId) => ({
  input: [workspaceId, "administrator"],
  expected: false,
  label: `invalid input: ${String(workspaceId)}`,
})) as HasWorkspaceRoleTestCase[];

const memberRoleFailureTestCases = invalidWorkspaceIds.map((workspaceId) => ({
  input: [workspaceId, "member"],
  expected: false,
  label: `invalid input: ${String(workspaceId)}`,
})) as HasWorkspaceRoleTestCase[];

const hasWorkspaceRoleTestCases: HasWorkspaceRoleTestCase[] = [
  {
    input: ["1", "member"],
    expected: true,
    label: "correct role match",
  },
  {
    input: ["1", "administrator"],
    expected: false,
    label: "role mismatch on existing id",
  },
  {
    input: ["2", "member"],
    expected: false,
    label: "role mismatch",
  },
  {
    input: ["2", "administrator"],
    expected: true,
    label: "correct role match (other)",
  },
  {
    input: [["1", "3"], "member"],
    expected: true,
    label: "multiple items all match role",
  },
  {
    input: [["1", "3"], "administrator"],
    expected: false,
    label: "multiple items mismatch role",
  },
  {
    input: [["2", "4"], "member"],
    expected: false,
    label: "multiple items mismatch role (other)",
  },
  {
    input: [["2", "4"], "administrator"],
    expected: true,
    label: "multiple items all match admin",
  },
  {
    input: ["5", "administrator"],
    expected: false,
    label: "non-existent workspace",
  },
  {
    input: ["5", "member"],
    expected: false,
    label: "non-existent workspace",
  },

  // Administrator role failure test cases
  ...adminRoleFailureTestCases,

  // Member role failure test cases
  ...memberRoleFailureTestCases,

  // Invalid role test cases
  ...invalidRoleTestCases,
];

/**
 * isInWorkspace
 */
describe("isInWorkspace", () => {
  describe("membership validation", () => {
    test.each(isInWorkspaceTestCases)("$label", ({ input: ids, expected }) => {
      expect(isInWorkspace(ids)).toBe(expected);
    });
  });

  describe("invariants", () => {
    test("idempotence: duplicates do not change result", () => {
      expect(isInWorkspace(["1", "1", "1"])).toBe(isInWorkspace("1"));
    });

    test("order-invariance: result unaffected by order", () => {
      expect(isInWorkspace(["1", "3"])).toBe(isInWorkspace(["3", "1"]));
    });

    test("single-vs-array equivalence", () => {
      expect(isInWorkspace("2")).toBe(isInWorkspace(["2"]));
    });
  });
});

/**
 * ensureIsInWorkspace
 */
describe("ensureIsInWorkspace", () => {
  describe("success cases", () => {
    test.each(isInWorkspaceTestCases.filter(({ expected }) => expected))(
      "does not throw on valid input: $label",
      ({ input }) => {
        expect(() => {
          ensureIsInWorkspace(input);
        }).not.toThrow();
      },
    );
  });

  describe("failure cases", () => {
    test.each(isInWorkspaceTestCases.filter(({ expected }) => !expected))(
      "throws on invalid input: $label",
      ({ input }) => {
        expect(() => {
          ensureIsInWorkspace(input);
        }).toThrow("Unauthorized");
      },
    );
  });
});

/**
 * hasWorkspaceRole
 */
describe("hasWorkspaceRole", () => {
  describe("role validation", () => {
    test.each(hasWorkspaceRoleTestCases)("$label", ({ input, expected }) => {
      expect(hasWorkspaceRole(...input)).toBe(expected);
    });
  });

  describe("invariants", () => {
    test("idempotence: duplicates do not change result", () => {
      expect(hasWorkspaceRole(["2", "2", "2"], "administrator")).toBe(
        hasWorkspaceRole("2", "administrator"),
      );
    });

    test("order-invariance: result unaffected by order", () => {
      expect(hasWorkspaceRole(["2", "4"], "administrator")).toBe(
        hasWorkspaceRole(["4", "2"], "administrator"),
      );
    });

    test("single-vs-array equivalence", () => {
      expect(hasWorkspaceRole("2", "administrator")).toBe(
        hasWorkspaceRole(["2"], "administrator"),
      );
    });
  });
});

/**
 * ensureHasWorkspaceRole
 */
describe("ensureHasWorkspaceRole", () => {
  describe("success cases", () => {
    test.each(hasWorkspaceRoleTestCases.filter(({ expected }) => expected))(
      "does not throw on valid input: $label",
      ({ input }) => {
        expect(() => {
          ensureHasWorkspaceRole(...input);
        }).not.toThrow();
      },
    );
  });

  describe("failure cases", () => {
    test.each(hasWorkspaceRoleTestCases.filter(({ expected }) => !expected))(
      "throws on invalid input: $label",
      ({ input }) => {
        expect(() => {
          ensureHasWorkspaceRole(...input);
        }).toThrow("Unauthorized");
      },
    );
  });
});

/**
 * cross-function invariants
 */
describe("cross-function invariants", () => {
  test("hasWorkspaceRole(ids, role) implies isInWorkspace(ids)", () => {
    const ids = ["2", "4"]; // both admins
    expect(hasWorkspaceRole(ids, "administrator")).toBe(true);
    expect(isInWorkspace(ids)).toBe(true);
  });

  test("ensure functions throw same error message", () => {
    expect(() => {
      ensureIsInWorkspace("5");
    }).toThrow("Unauthorized");

    expect(() => {
      ensureHasWorkspaceRole("5", "administrator");
    }).toThrow("Unauthorized");
  });
});
