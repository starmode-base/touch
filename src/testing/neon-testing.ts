import { makeNeonTesting } from "neon-testing";

const apiKey = process.env.NEON_API_KEY;
const projectId = process.env.NEON_PROJECT_ID;
if (!apiKey || !projectId) {
  throw new Error(
    "NEON_API_KEY and NEON_PROJECT_ID are required for neon-testing",
  );
}

// Export a configured lifecycle function to use in test files
export const neonTesting = makeNeonTesting({
  apiKey,
  projectId,
  // Recommended for Neon WebSocket drivers to automatically close connections
  autoCloseWebSockets: true,

  // When iterating on the db schema you want to use your own branch to branch
  // off of. The default is main and since it does not have the latest schema
  // yet, it will likely fail. Comment out the `parentBranchId` before merging
  // to main.

  // Mikael's dev branch:
  // https://console.neon.tech/app/projects/muddy-star-72330006/branches/br-lingering-mode-ad4utkeo
  parentBranchId: "br-lingering-mode-ad4utkeo",
});
