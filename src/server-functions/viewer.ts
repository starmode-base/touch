import { createServerFn } from "@tanstack/react-start";
import { syncViewer } from "~/lib/auth";

export const syncViewerSF = createServerFn().handler(() => {
  console.log("Syncing viewer");
  return syncViewer();
});
