import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vitest/config";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import metadata from "./metadata.json";
// import { neonTesting } from "neon-testing/vite";
// import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  server: {
    port: metadata.dev.port,
  },
  build: {
    rollupOptions: {
      // cloudflare:workers is a runtime module provided by the Workers environment
      external: ["cloudflare:workers"],
    },
  },
  plugins: [
    // Cloudflare plugin rejects resolve.external; Vitest's SSR env sets it for Node built-ins.
    // Exclude when running tests so Vitest can start.
    // cloudflare({ viteEnvironment: { name: "ssr" } }),
    ...(process.env.VITEST !== "true"
      ? [cloudflare({ viteEnvironment: { name: "ssr" } })]
      : []),
    tsConfigPaths(),
    tanstackStart(),
    // https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro
    // nitroV2Plugin(),
    viteReact(),
    tailwindcss(),
    // neonTesting(),
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
