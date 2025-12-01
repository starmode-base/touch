import { createStart } from "@tanstack/react-start";
import "~/lib/e2ee-globals";

// import { createMiddleware } from "@tanstack/react-start";

// const loggingMiddleware = createMiddleware().server(async ({ next }) => {
//   console.log("loggingMiddleware⚡️", next);
//   return next();
// });

export const startInstance = createStart(() => {
  return {
    // requestMiddleware: [loggingMiddleware],
  };
});
