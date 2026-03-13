import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const articles = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    deck: z.string(),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    topic: z.string(),
    author: z.string(),
    featured: z.boolean().optional().default(false),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/authors" }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    bio: z.string().optional(),
  }),
});

const topics = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/topics" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

const tools = defineCollection({
  loader: glob({ pattern: "**/*.{md,json}", base: "./src/content/tools" }),
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    status: z.enum(["planned", "beta", "live"]).optional(),
    dataSource: z.string().optional(),
    updateCadence: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
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
