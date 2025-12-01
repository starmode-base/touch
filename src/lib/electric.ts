import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { ensureEnv } from "~/lib/env";
import { syncViewer, type Viewer } from "~/lib/auth";

const ELECTRIC_SOURCE_ID = ensureEnv("ELECTRIC_SOURCE_ID");
const ELECTRIC_SOURCE_SECRET = ensureEnv("ELECTRIC_SOURCE_SECRET");

/**
 * Prepares the Electric SQL proxy URL from a request URL
 * Copies over Electric-specific query params and adds auth if configured
 * @param requestUrl - The incoming request URL
 * @returns The prepared Electric SQL origin URL
 */
function prepareElectricUrl(requestUrl: string): URL {
  const url = new URL(requestUrl);
  const electricUrl = "https://api.electric-sql.cloud";
  const originUrl = new URL("/v1/shape", electricUrl);

  // Copy Electric-specific query params
  url.searchParams.forEach((value, key) => {
    if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
      originUrl.searchParams.set(key, value);
    }
  });

  originUrl.searchParams.set("source_id", ELECTRIC_SOURCE_ID);
  originUrl.searchParams.set("source_secret", ELECTRIC_SOURCE_SECRET);

  return originUrl;
}

/**
 * Proxies a request to Electric SQL and returns the response
 * @param originUrl - The prepared Electric SQL URL
 * @returns The proxied response
 */
export const proxyElectricRequest = async (args: {
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
  const originUrl = prepareElectricUrl(args.request.url);

  // Table
  // https://electric-sql.com/docs/guides/shapes#table
  originUrl.searchParams.set("table", args.table);

  // Where
  // https://electric-sql.com/docs/guides/shapes#where-clause
  originUrl.searchParams.set("where", args.where(viewer));

  // Proxy the authorised request on to the Electric Cloud.
  const response = await fetch(originUrl);

  const headers = new Headers(response.headers);
  headers.delete(`content-encoding`);
  headers.delete(`content-length`);
  headers.set(`vary`, `cookie`);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
