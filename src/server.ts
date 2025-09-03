/**
 * https://clerk.com/docs/quickstarts/tanstack-react-start
 * https://github.com/clerk/javascript/blob/main/packages/tanstack-react-start/CHANGELOG.md
 * https://www.npmjs.com/package/@clerk/tanstack-react-start
 */
import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback,
} from "@tanstack/react-start/server";
import { createRouter } from "./router";
import { createClerkHandler } from "@clerk/tanstack-react-start/server";

const handlerFactory = createClerkHandler(
  createStartHandler({
    createRouter,
  }),
);

export default defineHandlerCallback(async (event) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  const startHandler = await handlerFactory(defaultStreamHandler);
  return startHandler(event);
});
