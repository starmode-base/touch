/**
 * https://github.com/clerk/javascript/blob/main/packages/tanstack-react-start/CHANGELOG.md
 */
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { createRouter } from "./router";
import { createClerkHandler } from "@clerk/tanstack-react-start/server";

export default createClerkHandler(
  createStartHandler({ createRouter }),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
)(defaultStreamHandler);
