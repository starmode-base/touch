import "dotenv/config";
import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";

/**
 * Standalone Vitest config: tests run in Node and must not load the
 * Cloudflare plugin from vite.config.ts (it conflicts with Vitest's SSR
 * environment)
 */
export default defineConfig({
  plugins: [tsConfigPaths()],
  test: {
    setupFiles: ["neon-testing/setup", "vitest.clerk.setup.ts"],
    testTimeout: 10000,
  },
});
