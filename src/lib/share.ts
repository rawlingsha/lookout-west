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
      name: "LinkedIn",
      href: destination("https://www.linkedin.com/sharing/share-offsite/", {
        url,
      }),
    },
    {
      name: "X",
      href: destination("https://x.com/intent/tweet", { text: title, url }),
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

export function articleShareImages(id: string, title: string): ShareImages {
  const base = `/social/generated/articles/${id}`;
  return {
    preview: `${base}-preview.jpg`,
    portrait: `${base}-portrait.jpg`,
    story: `${base}-story.jpg`,
    alt: `${title} — Lookout West`,
  };
}
