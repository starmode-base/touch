import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

// import metadata from "../../metadata.json";

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  //   baseURL: `http://localhost:${metadata.dev.port}`,

  plugins: [emailOTPClient()],
});
