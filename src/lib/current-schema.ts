import { z } from "astro/zod";

const localPath = z.string().regex(/^\/(?!\/)/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Use a valid YYYY-MM-DD date",
  );
const sourceSchema = z.object({
  label: z.string().min(1),
  url: z
    .url()
    .regex(/^https?:\/\//)
    .optional(),
  date: date.optional(),
});

export const currentSchema = z
  .object({
    date,
    draft: z.boolean().default(false),
    deck: z.string().optional(),
    readTime: z.number().int().positive().optional(),
    signals: z
      .array(
        z.object({
          id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          topic: z.enum([
            "energy",
            "growth",
            "housing",
            "labor",
            "land",
            "water",
          ]),
          geography: z.string().optional(),
          headline: z.string().min(1),
          body: z.string().min(1),
          source: sourceSchema,
          additionalSources: z.array(sourceSchema).optional(),
          relatedResearch: z
            .string()
            .regex(/^\/research\/[a-z0-9_-]+\/$/)
            .optional(),
          visual: z
            .object({
              src: localPath,
              alt: z.string().min(1),
              width: z.number().int().positive(),
              height: z.number().int().positive(),
              caption: z.string().min(1),
            })
            .optional(),
        }),
      )
      .min(5)
      .max(7),
  })
  .refine(
    (edition) =>
      new Set(edition.signals.map((signal) => signal.id)).size ===
      edition.signals.length,
    "Signal IDs must be unique within an edition",
  );
export type CurrentEdition = z.infer<typeof currentSchema>;
