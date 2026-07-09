/**
 * https://github.com/clerk/javascript/blob/main/packages/tanstack-react-start/CHANGELOG.md
 * https://www.npmjs.com/package/@clerk/tanstack-react-start
 * https://clerk.com/docs/tanstack-react-start/getting-started/quickstart
 * https://github.com/clerk/clerk-tanstack-react-start-quickstart
 */
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import "~/lib/e2ee-globals";

/**
 * Protect server functions (same-origin RPC endpoints) from cross-site
 * requests
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware, clerkMiddleware()],
  };
});
