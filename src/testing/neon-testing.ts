import { makeNeonTesting } from "neon-testing";
import { ensureEnv } from "../lib/env";

// Export a configured lifecycle function to use in test files
export const withNeonTestBranch = makeNeonTesting({
  apiKey: ensureEnv("NEON_API_KEY"),
  projectId: ensureEnv("NEON_PROJECT_ID"),
  // Recommended for Neon WebSocket drivers to automatically close connections
  autoCloseWebSockets: true,

  // When iterating on the db schema you want to use your own branch to branch
  // off of. The default is main and since it does not have the latest schema
  // yet, it will likely fail. Comment out the `parentBranchId` before merging
  // to main.

  // Ripley's dev branch:
  // https://console.neon.tech/app/projects/calm-sullaco-40252170/branches/lv-426-star-a7ylaXz8
  // parentBranchId: "lv-426-star-a7ylaXz8",
});
