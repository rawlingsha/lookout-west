import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { parse } from "yaml";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = path.join(root, "public");
// Keep generated artwork on the same palette as the publication.
const tokens = await readFile(path.join(root, "src/styles/tokens.css"), "utf8");
const token = (name) => {
  const value = tokens.match(new RegExp(`--color-${name}:\\s*([^;]+)`))?.[1];
  if (!value) throw new Error(`Missing brand token: ${name}`);
  return value.trim();
};
const background = token("bg");
const ink = token("text");
const accent = token("accent");
const manifest = {};
const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex").slice(0, 12);
async function writeChanged(output, bytes) {
  if (typeof bytes === "string") bytes = Buffer.from(bytes);
  await mkdir(path.dirname(output), { recursive: true });
  const previous = await readFile(output).catch(() => null);
  if (!previous?.equals(bytes)) await writeFile(output, bytes);
}
async function versionImage(source, expected) {
  const bytes = await readFile(source);
  const info = await sharp(bytes).metadata();
  if (!["jpeg", "png", "webp"].includes(info.format))
    throw new Error(`Social assets must be JPEG, PNG or WebP: ${source}`);
  if (expected && (info.width !== expected[0] || info.height !== expected[1]))
    throw new Error(`Expected ${expected.join(" × ")} social asset: ${source}`);
  // Match the output extension to decoded bytes so static hosts send the right MIME type.
  const extension = info.format === "jpeg" ? "jpg" : info.format;
  const name = `${path.basename(source, path.extname(source))}-${digest(bytes)}.${extension}`;
  const output = path.join(publicRoot, "social/generated/versioned", name);
  await writeChanged(output, bytes);
  return {
    path: `/social/generated/versioned/${name}`,
    width: info.width,
    height: info.height,
  };
}
const escapeMarkup = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[char],
  );

function localAsset(src) {
  if (!src.startsWith("/") || src.startsWith("//"))
    throw new Error(`Use a local image path: ${src}`);
  const resolved = path.resolve(publicRoot, `.${decodeURIComponent(src)}`);
  if (!resolved.startsWith(`${publicRoot}${path.sep}`))
    throw new Error(`Image escapes public directory: ${src}`);
  return resolved;
}

async function textLayer(
  text,
  left,
  top,
  width,
  maxHeight,
  size,
  color = "#171717",
  font = "Georgia",
) {
  for (let candidate = size; candidate >= 12; candidate -= 2) {
    const rendered = await sharp({
      text: {
        text: `<span foreground="${color}">${escapeMarkup(text)}</span>`,
        font: `${font} ${candidate}`,
        width,
        rgba: true,
        dpi: 72,
        spacing: 8,
      },
    })
      .png()
      .toBuffer({ resolveWithObject: true });
    if (rendered.info.height <= maxHeight)
      return { input: rendered.data, left, top };
  }
  throw new Error(`Text does not fit sharing template: ${text}`);
}

async function picture(src, left, top, width, height) {
  return {
    input: await sharp(localAsset(src))
      .rotate()
      .resize(width, height, { fit: "contain", background })
      .png()
      .toBuffer(),
    left,
    top,
  };
}

async function saveCard(item, output, format, isChart = false) {
  const [width, height] =
    format === "preview"
      ? [1200, 630]
      : format === "portrait"
        ? [1080, 1350]
        : [1080, 1920];
  const layers = [];
  const isPreview = format === "preview";
  const isStory = format === "story";
  const top = isStory ? 185 : 55;
  layers.push(
    await textLayer(
      "LOOKOUT WEST",
      56,
      top,
      width - 112,
      60,
      28,
      "#4a5d44",
      "Arial Bold",
    ),
  );
  if (isChart) {
    if (isPreview) {
      layers.push(await textLayer(item.title, 56, 157, 520, 310, 56));
      layers.push(await picture(item.image, 634, 70, 510, 510));
    } else {
      // Retain the entire original chart, including its title, legend, and sources.
      layers.push(
        await picture(item.image, 32, isStory ? 405 : 140, 1016, 1016),
      );
      if (isStory)
        layers.push(
          await textLayer(
            "Research and data on the American West",
            56,
            265,
            968,
            96,
            38,
          ),
        );
    }
  } else if (isPreview) {
    // The photo carries the story; the headline remains readable in page metadata.
    layers.length = 0;
    if (item.image) {
      layers.push({
        input: await sharp(localAsset(item.image))
          .rotate()
          .resize(width, 510, { fit: "cover", position: "centre" })
          .png()
          .toBuffer(),
        left: 0,
        top: 0,
      });
      layers.push(
        await textLayer(
          "LOOKOUT WEST",
          56,
          551,
          900,
          44,
          34,
          accent,
          "Arial Bold",
        ),
      );
    } else {
      layers.push(
        await textLayer(
          "LOOKOUT WEST",
          64,
          62,
          1072,
          50,
          32,
          accent,
          "Arial Bold",
        ),
      );
      layers.push(
        await textLayer(
          item.shortTitle ?? item.title,
          64,
          203,
          1072,
          300,
          112,
          ink,
        ),
      );
    }
  } else {
    layers.push(
      await textLayer(
        item.title,
        56,
        top + 92,
        968,
        isStory ? 335 : 280,
        isStory ? 80 : 72,
      ),
    );
    if (item.image)
      layers.push(
        await picture(
          item.image,
          56,
          isStory ? 670 : 475,
          968,
          isStory ? 850 : 670,
        ),
      );
  }
  const footerTop = isStory ? 1630 : height - 100;
  const footer = isChart
    ? "Explore the chart and read the research"
    : "Independent research on the American West";
  if (isChart || !isPreview)
    layers.push(
      await textLayer(
        footer,
        56,
        footerTop,
        width - 112,
        36,
        24,
        "#5b5b57",
        "Arial",
      ),
    );
  if (isChart || !isPreview)
    layers.push(
      await textLayer(
        "lookoutwest.us",
        56,
        footerTop + 42,
        width - 112,
        42,
        28,
        "#4a5d44",
        "Arial Bold",
      ),
    );
  await mkdir(path.dirname(output), { recursive: true });
  const result = await sharp({
    create: { width, height, channels: 3, background },
  })
    .composite(layers)
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
    .toBuffer();
  await writeChanged(output, result);
}

const articleIds = new Set();
for (const name of (
  await readdir(path.join(root, "src/content/articles"))
).filter((name) => /\.mdx?$/.test(name))) {
  const raw = await readFile(
    path.join(root, "src/content/articles", name),
    "utf8",
  );
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) throw new Error(`Missing frontmatter: ${name}`);
  const article = parse(frontmatter[1]);
  const id = name.replace(/\.mdx?$/, "");
  if (article.draft) continue;
  articleIds.add(id);
  const base = `social/generated/articles/${id}`;
  for (const format of ["preview", "portrait", "story"]) {
    await saveCard(
      {
        title: article.title,
        shortTitle: article.socialCardTitle ?? article.topic,
        image:
          format === "preview" && article.socialImageSource !== undefined
            ? article.socialImageSource
            : article.cardImage,
      },
      path.join(publicRoot, `${base}-${format}.jpg`),
      format,
    );
  }
  const preview = await versionImage(
    article.socialImage
      ? localAsset(article.socialImage)
      : path.join(publicRoot, `${base}-preview.jpg`),
    [1200, 630],
  );
  const instagram = {};
  for (const [format, override, size] of [
    ["portrait", article.instagramPostImage, [1080, 1350]],
    ["story", article.instagramStoryImage, [1080, 1920]],
  ]) {
    instagram[format] = override
      ? (await versionImage(localAsset(override), size)).path
      : `/${base}-${format}.jpg`;
  }
  manifest[`articles/${id}`] = {
    preview: preview.path,
    ...instagram,
    width: preview.width,
    height: preview.height,
    alt:
      article.socialImageAlt ??
      (article.socialImage
        ? `${article.socialTitle ?? article.title} — Lookout West`
        : ((article.socialImageSource === null
            ? `${article.socialCardTitle ?? article.topic} — Lookout West`
            : article.cardImageAlt) ?? `${article.title} — Lookout West`)),
  };
}

const figures = JSON.parse(
  await readFile(path.join(root, "src/data/share-figures.json"), "utf8"),
);
const seen = new Set();
for (const figure of figures) {
  if (
    !articleIds.has(figure.article) ||
    seen.has(figure.id) ||
    !/^[a-z0-9-]+$/.test(figure.id)
  )
    throw new Error(`Invalid share figure: ${figure.id}`);
  seen.add(figure.id);
  if (!figure.image) continue;
  for (const format of ["preview", "portrait", "story"]) {
    await saveCard(
      figure,
      path.join(
        publicRoot,
        `social/generated/figures/${figure.id}-${format}.jpg`,
      ),
      format,
      true,
    );
  }
  const preview = await versionImage(
    path.join(publicRoot, `social/generated/figures/${figure.id}-preview.jpg`),
    [1200, 630],
  );
  manifest[`figures/${figure.id}`] = {
    preview: preview.path,
    portrait: `/social/generated/figures/${figure.id}-portrait.jpg`,
    story: `/social/generated/figures/${figure.id}-story.jpg`,
    alt: figure.alt ?? figure.title,
    width: preview.width,
    height: preview.height,
  };
  await sharp(localAsset(figure.image))
    .rotate()
    .png()
    .toFile(path.join(publicRoot, `social/generated/figures/${figure.id}.png`));
}
await saveCard(
  { title: "Research, data, and decisions in the American West." },
  path.join(publicRoot, "social/og-default.jpg"),
  "preview",
);
await writeFile(
  path.join(publicRoot, "social/og-article.jpg"),
  await readFile(path.join(publicRoot, "social/og-default.jpg")),
);
manifest.defaultImage = (
  await versionImage(
    path.join(publicRoot, "social/og-default.jpg"),
    [1200, 630],
  )
).path;
console.log(
  `Share images ready: ${articleIds.size} articles, ${figures.filter((figure) => figure.image).length} charts, and the site fallback.`,
);

async function saveCurrentCard(date, output, format = "preview") {
  const [width, height] =
    format === "preview"
      ? [1200, 630]
      : format === "portrait"
        ? [1080, 1350]
        : [1080, 1920];
  const top = format === "story" ? 260 : format === "portrait" ? 160 : 62;
  const layers = [
    await textLayer(
      "LOOKOUT WEST",
      64,
      top,
      width - 128,
      52,
      34,
      background,
      "Arial Bold",
    ),
    await textLayer(
      "The Current",
      58,
      top + (format === "preview" ? 136 : 210),
      width - 116,
      300,
      format === "preview" ? 146 : 130,
      background,
    ),
    await textLayer(
      date
        ? new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(date))
        : "The West & Plains this week",
      64,
      top + (format === "preview" ? 335 : 570),
      width - 128,
      100,
      44,
      background,
      "Arial",
    ),
  ];
  if (date)
    layers.push(
      await textLayer(
        "The West & Plains this week",
        64,
        format === "preview" ? 523 : height - 320,
        width - 128,
        70,
        30,
        background,
        "Arial",
      ),
    );
  await writeChanged(
    output,
    await sharp({ create: { width, height, channels: 3, background: accent } })
      .composite(layers)
      .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
      .toBuffer(),
  );
}
const editions = [];
for (const file of (
  await readdir(path.join(root, "src/content/current"))
).filter((name) => name.endsWith(".json"))) {
  const edition = JSON.parse(
    await readFile(path.join(root, "src/content/current", file), "utf8"),
  );
  if (!edition.draft) editions.push(edition);
}
for (const edition of [{}, ...editions]) {
  const id = edition.date ?? "publication";
  const base = `social/generated/current/${id}`;
  for (const format of ["preview", "portrait", "story"])
    await saveCurrentCard(
      edition.date,
      path.join(publicRoot, `${base}-${format}.jpg`),
      format,
    );
  const preview = await versionImage(
    edition.socialImage
      ? localAsset(edition.socialImage)
      : path.join(publicRoot, `${base}-preview.jpg`),
    [1200, 630],
  );
  manifest[`current/${id}`] = {
    preview: preview.path,
    portrait: edition.instagramPostImage
      ? (
          await versionImage(
            localAsset(edition.instagramPostImage),
            [1080, 1350],
          )
        ).path
      : `/${base}-portrait.jpg`,
    story: edition.instagramStoryImage
      ? (
          await versionImage(
            localAsset(edition.instagramStoryImage),
            [1080, 1920],
          )
        ).path
      : `/${base}-story.jpg`,
    alt:
      edition.socialImageAlt ??
      `Lookout West — The Current${edition.date ? `, ${edition.date}` : ""}. The West & Plains this week.`,
    width: preview.width,
    height: preview.height,
  };
}
await writeChanged(
  path.join(root, "src/data/social-images.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `The Current: ${editions.length} dated editions and an evergreen publication card.`,
);

// Optional review artifacts, never part of the deployed public directory.
if (process.argv.includes("--review")) {
  const reviewRoot = path.join(root, "docs/sharing-review");
  await mkdir(reviewRoot, { recursive: true });
  const samples = {
    ballot: "articles/economic-ballot-2026",
    resident: "articles/price-of-resident-priority",
    cattle: "articles/cattle-herd",
    current: "current/2026-10-23",
  };
  for (const [name, key] of Object.entries(samples))
    await writeChanged(
      path.join(reviewRoot, `${name}-1200.jpg`),
      await readFile(localAsset(manifest[key].preview)),
    );
  await saveCard(
    { title: "Western water", shortTitle: "Western water" },
    path.join(reviewRoot, "typography-1200.jpg"),
    "preview",
  );
  const layers = [];
  const names = [...Object.keys(samples), "typography"];
  for (const [i, name] of names.entries()) {
    for (const width of [600, 150]) {
      const bytes = await sharp(path.join(reviewRoot, `${name}-1200.jpg`))
        .resize(width)
        .jpeg({ quality: 90 })
        .toBuffer();
      await writeChanged(path.join(reviewRoot, `${name}-${width}.jpg`), bytes);
      layers.push({
        input: bytes,
        left: width === 600 ? 0 : 620,
        top: i * 335,
      });
    }
  }
  await writeChanged(
    path.join(reviewRoot, "contact-sheet.png"),
    await sharp({
      create: {
        width: 790,
        height: names.length * 335,
        channels: 3,
        background,
      },
    })
      .composite(layers)
      .png()
      .toBuffer(),
  );
}
