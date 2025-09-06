import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import appCss from "~/styles/app.css?url";
import metadata from "../../metadata.json";
import { inject } from "@vercel/analytics";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
} from "@clerk/tanstack-react-start";
import { createServerFn } from "@tanstack/react-start";
import { syncViewer } from "~/middleware/auth-viewer";

const authStateFn = createServerFn({ method: "GET" }).handler(() => {
  return syncViewer();
});

export const Route = createRootRoute({
  beforeLoad: async () => ({
    viewer: await authStateFn(),
  }),
  loader: ({ context }) => {
    return context.viewer;
  },
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
          <TanStackRouterDevtools position="bottom-right" />
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
  const viewer = Route.useLoaderData();

  return (
    <main className="flex h-dvh flex-col">
      <SignedIn>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white p-4">
          <div>You are signed in as: {viewer?.email}</div>
          <div className="flex items-center gap-2">
            <UserButton />
            <SignOutButton>
              <button className="h-fit rounded bg-sky-500 px-4 py-1 text-white">
                Sign out
              </button>
            </SignOutButton>
          </div>
        </div>
        {props.children}
      </SignedIn>
      <SignedOut>
        <div className="m-auto flex flex-col gap-4 rounded border border-slate-100 bg-white p-8">
          <div className="text-center text-4xl font-extrabold">
            {metadata.name}
          </div>
          <div className="max-w-xs text-center">{metadata.description}</div>
          <div className="m-auto flex gap-2">
            <SignInButton mode="modal">
              <button className="rounded bg-sky-500 px-4 py-1 text-white">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded bg-sky-500 px-4 py-1 text-white">
                Sign up
              </button>
            </SignUpButton>
          </div>
        </div>
      </SignedOut>
    </main>
  );
}
