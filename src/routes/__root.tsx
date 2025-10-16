import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import appCss from "~/styles/app.css?url";
import metadata from "../../metadata.json";
import { inject } from "@vercel/analytics";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/tanstack-react-start";
import { createServerFn } from "@tanstack/react-start";
import { syncViewer } from "~/lib/auth";
import { Button } from "~/components/atoms";
import { SignInWithPasskeyButton } from "~/components/auth";

const authStateFn = createServerFn({ method: "GET" }).handler(() => {
  return syncViewer();
});

export const Route = createRootRoute({
  beforeLoad: async () => ({
    // Ensure the viewer is synced from Clerk to the database. This also makes
    // the viewer available as context in the loader of descendant routes.
    viewer: await authStateFn(),
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: metadata.name },
      { name: "description", content: metadata.description },
      { name: "og:title", content: metadata.name },
      { name: "og:description", content: metadata.description },
      { name: "og:image", content: metadata.shareCardImage },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: `${metadata.browserIcon}?x7k9m2p4` },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument(props: React.PropsWithChildren) {
  // https://vercel.com/docs/analytics/quickstart
  inject();

  return (
    <Providers>
      <html>
        <head>
          <HeadContent />
        </head>
        <body>
          <RootLayout>{props.children}</RootLayout>
          {/* <TanStackRouterDevtools position="bottom-left" /> */}
          <Scripts />
        </body>
      </html>
    </Providers>
  );
}

function Providers(props: React.PropsWithChildren) {
  return <ClerkProvider>{props.children}</ClerkProvider>;
}

function RootLayout(props: React.PropsWithChildren) {
  return (
    <main className="bg-pattern-lines flex h-dvh flex-col bg-slate-50">
      <SignedIn>{props.children}</SignedIn>
      <SignedOut>
        <div className="m-auto flex flex-col gap-4 rounded border border-slate-100 bg-white p-8">
          <div className="text-center text-4xl font-extrabold">
            {metadata.name}
          </div>
          <div className="max-w-xs text-center">{metadata.description}</div>
          <div className="m-auto flex gap-2">
            <SignInButton mode="modal">
              <Button>Sign in with email</Button>
            </SignInButton>
            <SignInWithPasskeyButton>
              Sign in with passkey
            </SignInWithPasskeyButton>
            <SignUpButton mode="modal">
              <Button>Sign up</Button>
            </SignUpButton>
          </div>
        </div>
      </SignedOut>
    </main>
  );
}
