import { beforeEach, vi } from "vitest";

/**
 * Type-safe auth state for mocking
 */
type MockAuthState =
  | {
      isAuthenticated: true;
      userId: string;
      sessionClaims: { email: string };
    }
  | {
      isAuthenticated: false;
      userId: null;
      sessionClaims: null;
    };

/**
 * Helper to create type-safe auth mock values
 */
function createAuthState(
  args:
    | { isAuthenticated: true; userId: string; email: string }
    | { isAuthenticated: false },
): MockAuthState {
  if (args.isAuthenticated) {
    return {
      isAuthenticated: true,
      userId: args.userId,
      sessionClaims: { email: args.email },
    };
  }
  return {
    isAuthenticated: false,
    userId: null,
    sessionClaims: null,
  };
}

/**
 * Global mock for Clerk auth - can be overridden per test
 */
const mockGetAuth = vi.fn();

vi.mock("@clerk/tanstack-react-start/server", () => ({
  getAuth: mockGetAuth,
}));

vi.mock("@tanstack/react-start/server", () => ({
  getWebRequest: vi.fn(() => ({})),
}));

/**
 * Mock auth helpers for tests
 *
 * These set the auth state for the entire test (until the next beforeEach reset)
 */
export const mockAuth = {
  /**
   * Set auth state to unauthenticated for this test
   */
  unauthenticated: () => {
    mockGetAuth.mockResolvedValue(createAuthState({ isAuthenticated: false }));
  },

  /**
   * Set auth state to authenticated as a specific user for this test
   */
  authenticated: (userId: string, email: string) => {
    mockGetAuth.mockResolvedValue(
      createAuthState({ isAuthenticated: true, userId, email }),
    );
  },
};

/**
 * Reset auth to require explicit setup before each test
 *
 * Tests MUST explicitly set their authentication state:
 * - mockAuth.authenticated("ripley", "ripley@nostromo.space")
 * - mockAuth.unauthenticated()
 *
 * Forgetting to set auth will cause a clear error message.
 */
beforeEach(() => {
  mockGetAuth.mockImplementation(() => {
    throw new Error(
      "Auth state not set, call mockAuth.authenticated() or mockAuth.unauthenticated().",
    );
  });
});
