import type { APIContext } from "astro";
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { site } from "../data/site";

export async function GET(context: APIContext): Promise<Response> {
  const articles = (await getCollection("articles"))
    .filter((article) => !article.data.draft)
    .sort(
      (a, b) =>
        b.data.publishDate.getTime() - a.data.publishDate.getTime()
    );

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.siteUrl,
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.seoDescription ?? article.data.deck,
      pubDate: article.data.publishDate,
      link: `/research/${article.id}/`,
    })),
  });
}
