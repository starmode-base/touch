import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import appCss from "~/styles/app.css?url";
import metadata from "../../metadata.json";
import { inject } from "@vercel/analytics";

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
  inject();

  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {props.children}
        {/* <TanStackRouterDevtools position="bottom-left" /> */}
        <Scripts />
      </body>
    </html>
  );
}
