import { createMiddleware } from "@tanstack/react-start";
import { getViewer } from "~/lib/auth";

/**
 * Middleware to ensure the viewer is signed in
 */
export const ensureViewerMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const viewer = await getViewer();

  if (!viewer) {
    throw new Error("Unauthorized");
  }

  return next({
    context: {
      viewer,
    },
  });
});
