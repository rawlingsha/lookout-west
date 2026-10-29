import { z } from "astro/zod";

const localImage = z.string().regex(/^\/(?!\/)/);

/** Shared editorial overrides. Descriptions use the existing seoDescription/deck. */
export const socialFields = {
  socialTitle: z.string().min(1).optional(),
  socialImage: localImage.optional(),
  socialImageAlt: z.string().min(1).optional(),
  shareText: z.string().min(1).optional(),
  instagramPostImage: localImage.optional(),
  instagramStoryImage: localImage.optional(),
};
