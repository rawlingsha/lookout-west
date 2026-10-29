import manifest from "../data/social-images.json" with { type: "json" };

const { defaultImage: defaultShareImage, ...imageManifest } = manifest;
export { defaultShareImage };

export interface SharePayload {
  title: string;
  url: string;
  text?: string;
}

export interface ShareImages {
  preview: string;
  portrait: string;
  story: string;
  alt: string;
  width?: number;
  height?: number;
}

export function shareDestinations({ title, url, text = "" }: SharePayload) {
  const destination = (base: string, params: Record<string, string>) => {
    const result = new URL(base);
    for (const [key, value] of Object.entries(params))
      result.searchParams.set(key, value);
    return result.href;
  };
  return [
    {
      name: "X",
      href: destination(
        "https://x.com/intent/tweet",
        text ? { text, url } : { url },
      ),
    },
    {
      name: "LinkedIn",
      href: destination("https://www.linkedin.com/sharing/share-offsite/", {
        url,
      }),
    },
    {
      name: "Facebook",
      href: destination("https://www.facebook.com/sharer/sharer.php", {
        u: url,
      }),
    },
    {
      name: "Email",
      href: `mailto:?subject=${encodeURIComponent(`${title} — Lookout West`)}&body=${encodeURIComponent([text, url].filter(Boolean).join("\n\n"))}`,
    },
  ];
}

export const generatedShareImages = (key: string) =>
  (imageManifest as Record<string, ShareImages>)[key];

export function articleShareImages(id: string, title: string): ShareImages {
  const generated = generatedShareImages(`articles/${id}`);
  if (generated) return generated;
  const base = `/social/generated/articles/${id}`;
  return {
    preview: `${base}-preview.jpg`,
    portrait: `${base}-portrait.jpg`,
    story: `${base}-story.jpg`,
    alt: `${title} — Lookout West`,
  };
}

export function currentShareImages(date?: string): ShareImages {
  const key = date ? `current/${date}` : "current/publication";
  const images = generatedShareImages(key);
  if (!images)
    throw new Error(
      `Missing social images for ${key}. Run npm run images:share.`,
    );
  return images;
}
