import { getCollection } from "astro:content";
import type { CurrentEdition } from "./current-schema";

export async function getCurrentEditions(includeDrafts = false) {
  const entries = await getCollection("current");
  const dates = new Set<string>();
  for (const { data } of entries) {
    if (dates.has(data.date))
      throw new Error(`Duplicate Current edition date: ${data.date}`);
    dates.add(data.date);
  }
  return entries
    .filter(({ data }) => includeDrafts || !data.draft)
    .map(({ data }) => data)
    .sort((a, b) => b.date.localeCompare(a.date));
}
export const editionHref = (edition: CurrentEdition) =>
  `/current/${edition.date}/`;
export const currentDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
export const readingMinutes = (edition: CurrentEdition) =>
  edition.readTime ??
  Math.max(
    1,
    Math.ceil(
      edition.signals
        .map((signal) => `${signal.headline} ${signal.body}`)
        .join(" ")
        .split(/\s+/).length / 220,
    ),
  );
