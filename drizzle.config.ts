import { env } from "cloudflare:workers";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/postgres/migrations",
  schema: "./src/postgres/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  // casing: "snake_case",
  // introspect: {
  //   casing: "preserve",
  // },
});
