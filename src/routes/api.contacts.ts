import { createServerFileRoute } from "@tanstack/react-start/server";
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { ensureEnv } from "~/lib/env";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { db, schema } from "~/postgres/db";
import { eq } from "drizzle-orm";

export const ServerRoute = createServerFileRoute("/api/contacts").methods({
  GET: async ({ request }) => {
    const { userId } = await getAuth(request);

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const workspaceIds = await db()
      .query.users.findFirst({
        where: eq(schema.users.clerkUserId, userId),
        columns: {
          id: true,
        },
        with: {
          workspaceMemberships: {
            columns: {
              workspaceId: true,
            },
          },
        },
      })
      .then(
        (viewer) =>
          viewer?.workspaceMemberships.map((m) => m.workspaceId) ?? [],
      );

    // Construct the origin URL
    const originUrl = new URL(`/v1/shape`, `https://api.electric-sql.cloud`);

    // Add the source params
    originUrl.searchParams.set(`source_id`, ensureEnv("ELECTRIC_SOURCE_ID"));
    originUrl.searchParams.set(`secret`, ensureEnv("ELECTRIC_SOURCE_SECRET"));

    // Table
    originUrl.searchParams.set("table", "contacts");

    // Passthrough parameters from electric client
    const proxyUrl = new URL(request.url);
    proxyUrl.searchParams.forEach((value, key) => {
      if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
        originUrl.searchParams.set(key, value);
      }
    });

    // https://electric-sql.com/docs/guides/shapes#where-clause
    const whereClause = workspaceIds.length
      ? `workspace_id IN (${workspaceIds.map((id) => `'${id}'`).join(",")})`
      : `FALSE`; //
    originUrl.searchParams.set("where", whereClause);

    // Proxy the authorised request on to the Electric Cloud.
    const response = await fetch(originUrl);

    // Fetch decompresses the body but doesn't remove the
    // content-encoding & content-length headers which would
    // break decoding in the browser.
    //
    // See https://github.com/whatwg/fetch/issues/1729
    const headers = new Headers(response.headers);
    headers.delete(`content-encoding`);
    headers.delete(`content-length`);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
});
