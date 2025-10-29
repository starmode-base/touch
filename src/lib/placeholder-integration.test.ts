import { expect, test } from "vitest";
import { Pool } from "@neondatabase/serverless";
import { db, schema } from "~/postgres/db";
import { withNeonTestBranch } from "~/testing/neon-testing";

/**
 * Enable Neon Postgres integration tests
 */
withNeonTestBranch();

test("Neon WebSocket database operations", async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`CREATE TABLE posts (id SERIAL PRIMARY KEY, text TEXT)`);
  await pool.query(
    `INSERT INTO posts (text) VALUES ('This is Ripley, last survivor of the Nostromo, signing off.')`,
  );

  const posts = await pool.query(`SELECT * FROM posts`);
  expect(posts.rows).toStrictEqual([
    {
      id: 1,
      text: "This is Ripley, last survivor of the Nostromo, signing off.",
    },
  ]);
});

test("Drizzle ORM WebSocket database operations", async () => {
  await db().delete(schema.users);

  await db().insert(schema.users).values({
    email: "ellen.ripley@example.com",
    clerk_user_id: "qSX0fLb39fQz8GqRvk9D",
  });

  const users = await db().select().from(schema.users);

  expect(users).toStrictEqual([
    {
      id: expect.any(String),
      created_at: expect.any(String),
      updated_at: expect.any(String),
      email: "ellen.ripley@example.com",
      clerk_user_id: "qSX0fLb39fQz8GqRvk9D",
    },
  ]);
});
