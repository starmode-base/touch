import { createServerFn } from "@tanstack/react-start";
import { syncViewer } from "~/lib/auth";

export const syncViewerSF = createServerFn().handler(() => syncViewer());
