import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import appCss from "../styles.css?url";
import metadata from "../../metadata.json";
// import { inject } from "@vercel/analytics";
// import "~/lib/e2ee-globals";

export const Route = createRootRoute({
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
      { rel: "icon", href: metadata.browserIcon },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument(props: React.PropsWithChildren) {
  // https://vercel.com/docs/analytics/quickstart
  // inject();

  return (
    <Providers>
      <html>
        <head>
          <HeadContent />
        </head>
        <body>
          <Shell>{props.children}</Shell>
          {/* <TanStackRouterDevtools position="bottom-left" /> */}
          <Scripts />
        </body>
      </html>
    </Providers>
  );
}

function Providers(props: React.PropsWithChildren) {
  return <>{props.children}</>;
}

function Shell(props: React.PropsWithChildren) {
  return (
    <main className="bg-pattern-lines flex h-dvh flex-col bg-slate-50">
      {props.children}
    </main>
  );
}
