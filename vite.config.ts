import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import metadata from "./metadata.json";
import { neonTesting } from "neon-testing/vite";

export default defineConfig({
  server: {
    port: metadata.dev.port,
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    neonTesting(),
  ],
});
