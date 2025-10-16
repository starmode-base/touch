/**
 * https://github.com/clerk/clerk-docs/pull/2690/files
 * https://github.com/clerk/clerk-docs/blob/rob/tanstack-start-rc/docs/getting-started/quickstart.tanstack-react-start.mdx
 * https://github.com/clerk/clerk-docs/blob/rob/tanstack-start-rc/docs/reference/tanstack-react-start/clerk-middleware.mdx
 *
 * https://github.com/clerk/javascript/blob/main/packages/tanstack-react-start/CHANGELOG.md
 * https://www.npmjs.com/package/@clerk/tanstack-react-start
 * https://clerk.com/docs/quickstarts/tanstack-react-start
 * https://github.com/clerk/clerk-tanstack-react-start-quickstart
 */
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [clerkMiddleware()],
  };
});
