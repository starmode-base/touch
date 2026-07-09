import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import metadata from "./metadata.json";
import { neonTesting } from "neon-testing/vite";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";

export default defineConfig({
  server: {
    port: metadata.dev.port,
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    // https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro
    nitroV2Plugin(),
    viteReact(),
    tailwindcss(),
    neonTesting(),
  ],
  // TODO: Remove this once Clerk has removed SWR
  // See https://github.com/TanStack/router/issues/5738
  // https://github.com/TanStack/router/pull/6341/files
  resolve: {
    alias: [
      { find: "use-sync-external-store/shim/index.js", replacement: "react" },
    ],
  },
  test: {
    setupFiles: ["vitest.clerk.setup.ts"],
    testTimeout: 10000,
  },
});
