import { site } from "../data/site.ts";

/** A public content URL. Query strings are opt-in; article tracking is discarded. */
export function contentUrl(
  path: string,
  options: { fragment?: string; params?: Record<string, string> } = {},
) {
  const url = new URL(path, site.siteUrl);
  if (url.origin !== new URL(site.siteUrl).origin) {
    throw new Error("Content URLs must belong to Lookout West.");
  }
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/") && !/\.[a-z0-9]+$/i.test(url.pathname))
    url.pathname += "/";
  for (const [key, value] of Object.entries(options.params ?? {}))
    url.searchParams.set(key, value);
  if (options.fragment) url.hash = options.fragment;
  return url.href;
}
