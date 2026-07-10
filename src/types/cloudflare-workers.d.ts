/**
 * Minimal typing for the Cloudflare Workers runtime module. Replace with
 * `wrangler types` generated types if the binding surface grows.
 */
declare module "cloudflare:workers" {
  export const env: {
    HYPERDRIVE?: { connectionString: string };
  };
}
