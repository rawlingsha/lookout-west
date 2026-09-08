import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { parse } from "yaml";

const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = path.join(root, "public");
const background = "#f4f4f0";
const escapeMarkup = (text) => String(text).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);

function localAsset(src) {
  if (!src.startsWith("/") || src.startsWith("//")) throw new Error(`Use a local image path: ${src}`);
  const resolved = path.resolve(publicRoot, `.${decodeURIComponent(src)}`);
  if (!resolved.startsWith(`${publicRoot}${path.sep}`)) throw new Error(`Image escapes public directory: ${src}`);
  return resolved;
}

async function textLayer(text, left, top, width, maxHeight, size, color = "#171717", font = "Georgia") {
  for (let candidate = size; candidate >= 12; candidate -= 2) {
    const rendered = await sharp({ text: { text: `<span foreground="${color}">${escapeMarkup(text)}</span>`, font: `${font} ${candidate}`, width, rgba: true, dpi: 72, spacing: 8 } }).png().toBuffer({ resolveWithObject: true });
    if (rendered.info.height <= maxHeight) return { input: rendered.data, left, top };
  }
  throw new Error(`Text does not fit sharing template: ${text}`);
}

async function picture(src, left, top, width, height) {
  return { input: await sharp(localAsset(src)).rotate().resize(width, height, { fit: "contain", background }).png().toBuffer(), left, top };
}

async function saveCard(item, output, format, isChart = false) {
  const [width, height] = format === "preview" ? [1200, 630] : format === "portrait" ? [1080, 1350] : [1080, 1920];
  const layers = [];
  const isPreview = format === "preview";
  const isStory = format === "story";
  const top = isStory ? 185 : 55;
  layers.push(await textLayer("LOOKOUT WEST", 56, top, width - 112, 60, 28, "#4a5d44", "Arial Bold"));
  if (isChart) {
    if (isPreview) {
      layers.push(await textLayer(item.title, 56, 157, 520, 310, 56));
      layers.push(await picture(item.image, 634, 70, 510, 510));
    } else {
      // Retain the entire original chart, including its title, legend, and sources.
      layers.push(await picture(item.image, 32, isStory ? 405 : 140, 1016, 1016));
      if (isStory) layers.push(await textLayer("Research and data on the American West", 56, 265, 968, 96, 38));
    }
  } else if (isPreview) {
    layers.push(await textLayer(item.title, 56, 151, item.image ? 600 : 1088, 340, 64));
    if (item.image) layers.push(await picture(item.image, 736, 135, 408, 408));
  } else {
    layers.push(await textLayer(item.title, 56, top + 92, 968, isStory ? 335 : 280, isStory ? 80 : 72));
    if (item.image) layers.push(await picture(item.image, 56, isStory ? 670 : 475, 968, isStory ? 850 : 670));
  }
  const footerTop = isStory ? 1630 : height - 100;
  const footer = isChart ? "Explore the chart and read the research" : "Independent research on the American West";
  layers.push(await textLayer(footer, 56, footerTop, width - 112, 36, 24, "#5b5b57", "Arial"));
  layers.push(await textLayer("lookoutwest.us", 56, footerTop + 42, width - 112, 42, 28, "#4a5d44", "Arial Bold"));
  await mkdir(path.dirname(output), { recursive: true });
  const result = await sharp({ create: { width, height, channels: 3, background } }).composite(layers).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toBuffer();
  // Keep repeated dev/build runs from rewriting identical assets.
  const previous = await readFile(output).catch(() => null);
  if (!previous?.equals(result)) await writeFile(output, result);
}

const articleIds = new Set();
for (const name of (await readdir(path.join(root, "src/content/articles"))).filter((name) => /\.mdx?$/.test(name))) {
  const raw = await readFile(path.join(root, "src/content/articles", name), "utf8");
  const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) throw new Error(`Missing frontmatter: ${name}`);
  const article = parse(frontmatter[1]);
  const id = name.replace(/\.mdx?$/, "");
  if (article.draft) continue;
  articleIds.add(id);
  for (const format of ["preview", "portrait", "story"]) {
    await saveCard({ title: article.title, image: article.cardImage }, path.join(publicRoot, `social/generated/articles/${id}-${format}.jpg`), format);
  }
}

const figures = JSON.parse(await readFile(path.join(root, "src/data/share-figures.json"), "utf8"));
const seen = new Set();
for (const figure of figures) {
  if (!articleIds.has(figure.article) || seen.has(figure.id) || !/^[a-z0-9-]+$/.test(figure.id)) throw new Error(`Invalid share figure: ${figure.id}`);
  seen.add(figure.id);
  if (!figure.image) continue;
  for (const format of ["preview", "portrait", "story"]) {
    await saveCard(figure, path.join(publicRoot, `social/generated/figures/${figure.id}-${format}.jpg`), format, true);
  }
  await sharp(localAsset(figure.image)).rotate().png().toFile(path.join(publicRoot, `social/generated/figures/${figure.id}.png`));
}
await saveCard({ title: "Research, data, and decisions in the American West." }, path.join(publicRoot, "social/og-default.jpg"), "preview");
await writeFile(path.join(publicRoot, "social/og-article.jpg"), await readFile(path.join(publicRoot, "social/og-default.jpg")));
console.log(`Share images ready: ${articleIds.size} articles, ${figures.filter((figure) => figure.image).length} charts, and the site fallback.`);
