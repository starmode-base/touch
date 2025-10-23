import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { ensureEnv } from "~/lib/env";
import { syncViewer, type Viewer } from "~/lib/auth";

export const proxyElectricShape = async ({
  request,
  table,
  where,
}: {
  request: Request;
  /** https://electric-sql.com/docs/guides/shapes#table */
  table: string;
  /** https://electric-sql.com/docs/guides/shapes#where-clause */
  where: (viewer: Viewer) => string;
}) => {
  const viewer = await syncViewer();

  if (!viewer) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Construct the origin URL
  const originUrl = new URL(`/v1/shape`, `https://api.electric-sql.cloud`);

  // Add the source params
  originUrl.searchParams.set(`source_id`, ensureEnv("ELECTRIC_SOURCE_ID"));
  originUrl.searchParams.set(`secret`, ensureEnv("ELECTRIC_SOURCE_SECRET"));

  // Passthrough parameters from electric client
  const proxyUrl = new URL(request.url);
  proxyUrl.searchParams.forEach((value, key) => {
    if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
      originUrl.searchParams.set(key, value);
    }
  });

  // Table
  // https://electric-sql.com/docs/guides/shapes#table
  originUrl.searchParams.set("table", table);

  // Where
  // https://electric-sql.com/docs/guides/shapes#where-clause
  originUrl.searchParams.set("where", where(viewer));

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
};
