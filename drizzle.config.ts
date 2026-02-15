/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for drizzle-kit");

console.log("process.env.DATABASE_URL", typeof process?.env?.DATABASE_URL);
// @ts-ignore
console.log("env.DATABASE_URL", env && typeof env?.DATABASE_URL);

export default defineConfig({
  out: "./src/postgres/migrations",
  schema: "./src/postgres/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url,
  },
  // casing: "snake_case",
  // introspect: {
  //   casing: "preserve",
  // },
});
