import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Toolbar } from "~/components/toolbar";
import metadata from "../../metadata.json";
import { SignInButton, SignUpButton } from "@clerk/tanstack-react-start";
import { Button } from "~/components/atoms";
import { syncViewerSF } from "~/server-functions/viewer";
import { E2eeProvider } from "~/components/hooks/e2ee";
import { sendVerificationOTP, signIn, signUp, verifyOTP } from "~/lib/sign-up";
import { useState } from "react";

export const Route = createFileRoute("/_auth")({
  ssr: false,
  beforeLoad: async () => ({
    // Ensure the viewer is synced from Clerk to the database. This also makes
    // the viewer available as context in the loader of descendant routes.
    viewer: await syncViewerSF(),
  }),
  loader: ({ context }) => {
    return context;
  },
  component: RouteComponent,
});

function RouteComponent() {
  // useAutoUnlock();
  const { viewer } = Route.useLoaderData();
  const [email, setEmail] = useState("mikael+test@lirbank.com");
  const [password, setPassword] = useState("password");
  const [otp, setOtp] = useState("");

  if (!viewer) {
    return (
      <div className="m-auto flex flex-col gap-4 rounded border border-slate-100 bg-white p-8">
        <div className="text-center text-4xl font-extrabold">
          {metadata.name}
        </div>
        <div className="max-w-xs text-center">{metadata.description}</div>
        <div className="m-auto flex gap-2">
          <input
            className="rounded-md border border-slate-300 p-2"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </div>
        <div className="m-auto flex gap-2">
          <input
            className="rounded-md border border-slate-300 p-2"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          <Button onClick={() => signUp(email, password)}>
            Sign up with email
          </Button>
          <Button onClick={() => signIn(email, password)}>
            Sign in with email
          </Button>
        </div>
        <div className="m-auto flex gap-2">
          <input
            className="rounded-md border border-slate-300 p-2"
            type="text"
            placeholder="OTP"
            value={otp}
            onChange={(e) => {
              setOtp(e.target.value);
            }}
          />
          <Button onClick={() => sendVerificationOTP(email)}>
            Send verification OTP
          </Button>
          <Button onClick={() => verifyOTP(email, otp)}>
            Sign in with OTP
          </Button>
        </div>
        <div className="m-auto flex gap-2">
          <SignInButton mode="modal">
            <Button>Sign in with Clerk</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button>Sign up with Clerk</Button>
          </SignUpButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <E2eeProvider>
        <Toolbar />
        <Outlet />
      </E2eeProvider>
    </>
  );
}
