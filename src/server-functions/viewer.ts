import { createServerFn } from "@tanstack/react-start";
import { syncViewer } from "~/lib/auth-clerk";

export const syncViewerSF = createServerFn().handler(() => {
  return syncViewer();
});
