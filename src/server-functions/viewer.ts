import { createServerFn } from "@tanstack/react-start";
import { syncViewer } from "~/lib/auth";
// import {
//   // getRequest,
//   // getCookie,
//   // getCookies,
//   getRequestHeaders,
// } from "@tanstack/react-start/server";
// import { auth } from "~/lib/auth";

export const syncViewerSF = createServerFn().handler(async () => {
  // console.log("syncViewerSF⚡️", context);
  // const request = getRequest();
  // const cookie = getCookie("better-auth.session_token");
  // const cookies = getCookies();
  // const requestHeaders = getRequestHeaders();
  // console.log("request", request);
  // console.log("cookie", cookie);
  // console.log("cookies", cookies);
  // console.log("requestHeaders", requestHeaders);

  // const session = await auth.api.getSession({
  //   headers: getRequestHeaders(),
  // });
  // console.log("session", session);
  return syncViewer();
});
// Df4WOybigOj33mykP1txKhkqkKwxWEuV.wx9cPk2new4Ye38kRicMFSSmWD4U1cbT85/kLUW3X4c=
// Df4WOybigOj33mykP1txKhkqkKwxWEuV
