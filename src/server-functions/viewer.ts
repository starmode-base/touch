import { createServerFn } from "@tanstack/react-start";
import { getViewer } from "~/lib/auth";

export const getViewerSF = createServerFn().handler(() => {
  return getViewer();
});
