import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const articles = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    deck: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    topic: z.string(),
    topics: z.array(z.string()).optional(),
    author: z.string(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
    heroAlt: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/authors" }),
  schema: z.object({
    name: z.string(),
    slug: z.string(),
    role: z.string().optional(),
    bio: z.string().optional(),
    email: z.string().optional(),
  }),
});

const topics = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/topics" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string().optional(),
  }),
});

const tools = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/tools" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    summary: z.string(),
    status: z.enum(["planned", "beta", "live"]).default("planned"),
    topic: z.string(),
    geography: z.string().optional(),
    dataSource: z.string().optional(),
    updateCadence: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
  }),
});

export const collections = {
  articles,
  authors,
  topics,
  tools,
  pages,
};
