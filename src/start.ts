/**
 * https://github.com/clerk/javascript/blob/main/packages/tanstack-react-start/CHANGELOG.md
 * https://www.npmjs.com/package/@clerk/tanstack-react-start
 * https://clerk.com/docs/tanstack-react-start/getting-started/quickstart
 * https://github.com/clerk/clerk-tanstack-react-start-quickstart
 */
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createStart } from "@tanstack/react-start";
import { onDekStateChange } from "~/lib/e2ee";

// Set up Chrome extension integration
// Listen to DEK state changes and notify the extension
if (typeof window !== "undefined") {
  onDekStateChange((event) => {
    window.postMessage(
      {
        type: "TOUCH_DEK_STATE_CHANGE",
        isUnlocked: event.isUnlocked,
      },
      window.location.origin,
    );
  });
}

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [clerkMiddleware()],
  };
});
