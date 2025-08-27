import { defineConfig } from "drizzle-kit";
import { ensureEnv } from "~/lib/env";

export default defineConfig({
  out: "./src/postgres/migrations",
  schema: "./src/postgres/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: ensureEnv("DATABASE_URL"),
  },
  casing: "snake_case",
});
