import type {
  LoaderFunction,
  LinksFunction,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import Shell from "./shell";
import {
  Links,
  LiveReload,
  Meta,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import styles from "~/styles/zam.css";

import tailwindStylesheetUrl from "./styles/tailwind.css";
import { getUser } from "./session.server";
import { useEffect } from "react";

// @ts-ignore
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: tailwindStylesheetUrl },
    { rel: "stylesheet", href: styles },
  ];
};

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "Mango Surprise!",
  viewport: "width=device-width,initial-scale=1",
});

type LoaderData = {
  user: Awaited<ReturnType<typeof getUser>>;
};

export const loader: LoaderFunction = async ({ request }) => {
  return json<LoaderData>({
    user: await getUser(request),
  });
};

const useScript = (url: string, selector = "body", async = false) => {
  useEffect(() => {
    const element = document.querySelector(selector);
    const script = document.createElement("script");
    script.src = url;
    script.async = async;
    element?.appendChild(script);
    return () => {
      element?.removeChild(script);
    };
  }, [url]);
};

export default function App() {
  useScript("https://zam.zamimg.com/j/tooltips.js?c");
  useScript("/scripts/zam.js");

  return (
    <html lang="en" className="h-full" suppressHydrationWarning={true}>
      <head>
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <Shell />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
