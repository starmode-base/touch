import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import metadata from "./metadata.json";
import { cloudflare } from "@cloudflare/vite-plugin";

// Tests use vitest.config.ts instead (the Cloudflare plugin conflicts with
// Vitest's SSR environment)
export default defineConfig({
  server: {
    port: metadata.dev.port,
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});
