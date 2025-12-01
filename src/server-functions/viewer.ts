import { createServerFn } from "@tanstack/react-start";
import { getViewer } from "~/lib/auth";

export const syncViewerSF = createServerFn().handler(() => {
  return getViewer();
});
