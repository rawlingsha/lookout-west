import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { Window } from "happy-dom";
import sharp from "sharp";
import { parse } from "yaml";
import { contentUrl } from "../src/lib/urls.ts";
import { shareDestinations } from "../src/lib/share.ts";
import {
  initializeShareActions,
  cleanupShareActions,
} from "../src/scripts/share-actions.ts";

const origin = "https://lookoutwest.us";
const articlePath = "/research/data-centers/";
const html = await readFile(`dist${articlePath}index.html`, "utf8");
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
function fixture(t, { mobile = false, markup = html, enhance = true } = {}) {
  const win = new Window({
    url: `${origin}${articlePath}?utm_source=test#old`,
    width: mobile ? 390 : 1280,
    height: 844,
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  win.document.write(markup);
  t.after(() => win.happyDOM.close());
  if (enhance) initializeShareActions(win.document);
  const group = win.document.querySelector("[data-share-actions]");
  const trigger = group.querySelector("[data-share-trigger]");
  const dialog = win.document.querySelector("dialog.share-dialog");
  return { win, doc: win.document, group, trigger, dialog };
}

test("article URLs discard tracking, while explicit figure/filter state survives", () => {
  assert.equal(
    contentUrl(`${articlePath}?utm_source=x#old`),
    `${origin}${articlePath}`,
  );
  assert.equal(
    contentUrl("/research/demographics_fertility"),
    `${origin}/research/demographics_fertility/`,
  );
  assert.equal(
    contentUrl(articlePath, { fragment: "figure-local-capacity-ledger" }),
    `${origin}${articlePath}#figure-local-capacity-ledger`,
  );
  const tool = new URL(
    contentUrl("/tools/example?utm_source=x", {
      params: { states: "CO,NM", metric: "income" },
    }),
  );
  assert.equal(tool.searchParams.get("states"), "CO,NM");
  assert.equal(tool.searchParams.has("utm_source"), false);
  assert.throws(() => contentUrl("https://example.com/article"));
});

test("destinations preserve encoded URLs and punctuation without extra parameters", () => {
  const payload = {
    title: "Growth & water: who’s paying? #West",
    text: "A & B\nC",
    url: `${origin}${articlePath}#figure-local-capacity-ledger`,
  };
  const links = shareDestinations(payload);
  assert.equal(
    new URL(links.find((link) => link.name === "X").href).searchParams.get(
      "text",
    ),
    payload.text,
  );
  assert.equal(
    new URL(
      links.find((link) => link.name === "Facebook").href,
    ).searchParams.get("u"),
    payload.url,
  );
  assert.equal(
    new URL(
      links.find((link) => link.name === "LinkedIn").href,
    ).searchParams.get("url"),
    payload.url,
  );
  assert.equal(
    new URL(links.find((link) => link.name === "Email").href).searchParams.get(
      "body",
    ),
    `${payload.text}\n\n${payload.url}`,
  );
});

test("all built articles have distinct, valid previews and downloads", async (t) => {
  const previews = new Set();
  let publishedCount = 0;
  for (const file of (await readdir("src/content/articles")).filter((name) =>
    /\.mdx?$/.test(name),
  )) {
    const id = file.replace(/\.mdx?$/, "");
    const source = await readFile(`src/content/articles/${file}`, "utf8");
    const data = parse(source.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1]);
    if (data.draft) {
      await assert.rejects(readFile(`dist/research/${id}/index.html`), {
        code: "ENOENT",
      });
      for (const index of ["rss.xml", "sitemap-0.xml"]) {
        assert.ok(
          !(await readFile(`dist/${index}`, "utf8")).includes(
            `/research/${id}/`,
          ),
          `Draft ${id} must be absent from ${index}`,
        );
      }
      continue;
    }
    publishedCount += 1;
    const markup = await readFile(`dist/research/${id}/index.html`, "utf8");
    const { doc } = fixture(t, { markup, enhance: false });
    const meta = (name) =>
      doc.querySelector(`meta[property="${name}"]`)?.content;
    assert.equal(meta("og:type"), "article");
    assert.equal(
      meta("og:title"),
      data.socialTitle ?? doc.querySelector("h1").textContent,
    );
    assert.equal(meta("og:url"), `${origin}/research/${id}/`);
    assert.equal(doc.querySelector("link[rel=canonical]").href, meta("og:url"));
    assert.ok(meta("og:image:alt"));
    assert.ok(meta("article:published_time"));
    const image = new URL(meta("og:image"));
    previews.add(image.pathname);
    const imageData = await sharp(`dist${decodeURIComponent(image.pathname)}`).metadata();
    assert.equal(imageData.width, Number(meta("og:image:width")));
    assert.equal(imageData.height, Number(meta("og:image:height")));
    assert.equal(imageData.format, "jpeg");
    assert.equal(doc.querySelectorAll("#article-share-top-heading").length, 1);
    assert.equal(doc.querySelectorAll("#article-share-end-heading").length, 1);
    for (const variant of ["portrait", "story"]) {
      const image = await sharp(
        `dist/social/generated/articles/${id}-${variant}.jpg`,
      ).metadata();
      assert.equal(image.width, 1080);
      assert.equal(image.height, variant === "portrait" ? 1350 : 1920);
    }
  }
  assert.ok(publishedCount > 0);
  assert.equal(previews.size, publishedCount);
  assert.equal(
    (await sharp("dist/social/og-default.jpg").metadata()).width,
    1200,
  );
});

test("chart pages have their own metadata and return to an article or a real figure anchor", async (t) => {
  const figures = JSON.parse(
    await readFile("src/data/share-figures.json", "utf8"),
  );
  for (const {
    article,
    id: figure,
    image: sourceImage,
    standalone,
  } of figures.filter((entry) => entry.image)) {
    const url = `/visualizations/${article}/${figure}/`;
    const articleUrl = `${origin}/research/${article}/${standalone ? "" : `#figure-${figure}`}`;
    const { doc } = fixture(t, {
      markup: await readFile(`dist${url}index.html`, "utf8"),
      enhance: false,
    });
    assert.equal(
      doc.querySelector("link[rel=canonical]").href,
      `${origin}${url}`,
    );
    assert.equal(
      doc.querySelector('meta[property="og:url"]').content,
      `${origin}${url}`,
    );
    assert.ok(
      doc
        .querySelector('meta[property="og:image"]')
        .content.match(
          new RegExp(`/versioned/${figure}-preview-[a-f0-9]{12}\\.jpg$`),
        ),
    );
    assert.ok(doc.querySelector(`a[href="${articleUrl}"]`));
    if (standalone)
      assert.equal(
        doc.querySelectorAll(`a[href*="#figure-${figure}"]`).length,
        0,
      );
    const articleDoc = fixture(t, {
      markup: await readFile(`dist/research/${article}/index.html`, "utf8"),
      enhance: false,
    }).doc;
    assert.ok(articleDoc.querySelector("h1"), "The parent article exists");
    const block = standalone
      ? doc.querySelector(".visualization")
      : articleDoc.getElementById(`figure-${figure}`);
    assert.ok(block, `Missing article anchor: ${article}/#figure-${figure}`);
    assert.ok(
      block.querySelector(`[data-share-actions][data-url="${origin}${url}"]`),
    );
    assert.ok(block.querySelector("[data-copy-link]"));
    assert.ok(
      (standalone && block.querySelector(`img[src="${sourceImage}"]`)) ||
        block.querySelector(`a[href="${sourceImage}"] img`) ||
        (block.querySelector("[data-energy-plot]") &&
          block.querySelector(`a[href="${sourceImage}"]`)),
    );
    assert.ok(
      block.querySelector(
        `a[download][href="/social/generated/figures/${figure}.png"]`,
      ),
    );
    const original = await sharp(`public${sourceImage}`).metadata();
    const download = await sharp(
      `dist/social/generated/figures/${figure}.png`,
    ).metadata();
    assert.equal(download.width, original.width);
    assert.equal(download.height, original.height);
    assert.equal(download.format, "png");
    for (const [variant, width, height] of [
      ["preview", 1200, 630],
      ["portrait", 1080, 1350],
      ["story", 1080, 1920],
    ]) {
      const exported = await sharp(
        `dist/social/generated/figures/${figure}-${variant}.jpg`,
      ).metadata();
      assert.equal(exported.width, width);
      assert.equal(exported.height, height);
    }
  }
  const { doc } = fixture(t, { enhance: false });
  assert.ok(doc.querySelector("#figure-local-capacity-ledger table"));
  assert.equal(
    doc.querySelectorAll("#figure-local-capacity-ledger tbody tr").length,
    7,
  );
  assert.equal(
    doc.querySelector("#figure-local-capacity-ledger [data-share-actions]")
      .dataset.url,
    `${origin}${articlePath}#figure-local-capacity-ledger`,
  );
});

test("no-JavaScript markup retains destination links and a selectable address", (t) => {
  const { doc, group } = fixture(t, { enhance: false });
  assert.equal(group.querySelectorAll(".share-destinations a").length, 4);
  assert.equal(
    group.querySelector("[data-share-url]").value,
    `${origin}${articlePath}`,
  );
  assert.ok(group.querySelector("[data-copy-link]").hidden);
  assert.equal(doc.querySelectorAll("dialog.share-dialog").length, 0);
  assert.ok(doc.querySelector('script[src*="_astro/"]'));
  for (const link of group.querySelectorAll('a[target="_blank"]'))
    assert.ok(link.rel.includes("noopener"));
});

test("copy uses the canonical payload and initialization is idempotent", async (t) => {
  const { win, doc, group } = fixture(t);
  let copied;
  Object.defineProperty(win.navigator, "clipboard", {
    value: {
      writeText: async (text) => {
        copied = text;
      },
    },
  });
  initializeShareActions(doc);
  assert.equal(
    doc.querySelectorAll("dialog.share-dialog").length,
    doc.querySelectorAll("[data-share-actions]").length,
  );
  group.querySelector("[data-copy-link]").click();
  await settle();
  assert.equal(copied, `${origin}${articlePath}`);
  assert.equal(
    group.querySelector("[data-share-status]").textContent,
    "Link copied.",
  );
});

test("desktop panel closes on Escape, outside pointer, and another trigger", (t) => {
  const { win, doc, trigger, dialog } = fixture(t);
  trigger.click();
  assert.equal(dialog.open, true);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  dialog.dispatchEvent(
    new win.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
  assert.equal(dialog.open, false);
  assert.equal(doc.activeElement, trigger);
  trigger.click();
  doc.body.dispatchEvent(
    new win.PointerEvent("pointerdown", { bubbles: true }),
  );
  assert.equal(dialog.open, false);
  trigger.click();
  const end = doc.querySelectorAll("[data-share-trigger]")[2];
  end.click();
  assert.equal(dialog.open, false);
  assert.equal(doc.querySelectorAll("dialog.share-dialog[open]").length, 1);
});

test("mobile sheet releases its scroll lock and restores focus", (t) => {
  const { win, doc, trigger, dialog } = fixture(t, { mobile: true });
  trigger.click();
  assert.equal(dialog.open, true);
  assert.equal(
    doc.documentElement.classList.contains("has-share-dialog"),
    true,
  );
  dialog.dispatchEvent(new win.Event("cancel", { cancelable: true }));
  assert.equal(dialog.open, false);
  assert.equal(
    doc.documentElement.classList.contains("has-share-dialog"),
    false,
  );
  assert.equal(doc.activeElement, trigger);
});

test("clipboard denial opens a manual-copy fallback without claiming success", async (t) => {
  const { win, doc, group, dialog } = fixture(t);
  Object.defineProperty(win.navigator, "clipboard", {
    value: {
      writeText: async () => {
        throw new Error("Denied");
      },
    },
  });
  group.querySelector("[data-copy-link]").click();
  await settle();
  const field = dialog.querySelector("[data-share-url]");
  assert.equal(dialog.open, true);
  assert.equal(doc.activeElement, field);
  assert.match(
    dialog.querySelector("[data-panel-status]").textContent,
    /Copy wasn’t available/,
  );
  assert.equal(
    group.querySelector("[data-copy-label]").textContent,
    "Copy link",
  );
});

test("native share is called directly from the primary click; cancellation is quiet and failures offer alternatives", async (t) => {
  const { win, doc, group } = fixture(t, { enhance: false });
  const calls = [];
  let failure = { name: "AbortError" }; // Browser errors need not share the module's Error realm.
  win.navigator.share = (payload) => {
    calls.push(payload);
    return failure ? Promise.reject(failure) : Promise.resolve();
  };
  initializeShareActions(doc);
  const trigger = group.querySelector("[data-share-trigger]");
  const dialog = doc.querySelector("dialog.share-dialog");
  trigger.click();
  assert.equal(
    calls.length,
    1,
    "No await or fetch may consume activation before share()",
  );
  assert.equal(calls[0].url, `${origin}${articlePath}`);
  assert.equal(calls[0].text, undefined);
  await settle();
  assert.equal(dialog.open, false);
  assert.equal(group.querySelector("[data-share-status]").textContent, "");
  failure = new Error("Not allowed");
  trigger.click();
  await settle();
  assert.equal(dialog.open, true);
  assert.match(
    dialog.querySelector("[data-panel-status]").textContent,
    /copy the link/,
  );
  dialog.querySelector("[data-share-close]").click();
  failure = null;
  trigger.click();
  await settle();
  assert.equal(dialog.open, false);
  assert.equal(group.querySelector("[data-share-status]").textContent, "");
  group.querySelector("[data-share-options]").click();
  assert.equal(
    dialog.open,
    true,
    "Native share browsers must retain platform and Instagram options",
  );
});

test("image files are prepared before the final native share click", async (t) => {
  const { win, doc, group } = fixture(t, { enhance: false });
  const calls = [];
  win.navigator.share = async (payload) => {
    calls.push(payload);
  };
  win.navigator.canShare = ({ files }) => files?.[0]?.type === "image/jpeg";
  win.fetch = async () =>
    new win.Response(new Uint8Array([255, 216, 255]), {
      headers: { "Content-Type": "image/jpeg" },
    });
  initializeShareActions(doc);
  group.querySelector("[data-share-options]").click();
  const helper = doc.querySelector("dialog.share-dialog [data-image-helper]");
  helper.open = true;
  helper.dispatchEvent(new win.Event("toggle"));
  await settle();
  const button = helper.querySelector("[data-share-image]");
  assert.equal(button.hidden, false);
  button.click();
  await settle();
  assert.equal(calls[0].files[0].type, "image/jpeg");
  assert.match(calls[0].files[0].name, /-story\.jpg$/);
  assert.equal(calls[0].url, undefined);
});

test("URL-only X intents do not duplicate headlines, including long punctuation-heavy titles", () => {
  const title = "Who's paying? Water & land #West — ".repeat(100);
  const links = shareDestinations({
    title,
    url: `${origin}/research/cattle-herd/`,
  });
  assert.deepEqual(
    links.map(({ name }) => name),
    ["X", "LinkedIn", "Facebook", "Email"],
  );
  const x = new URL(links[0].href);
  assert.equal(x.searchParams.has("text"), false);
  assert.equal(x.searchParams.get("url"), `${origin}/research/cattle-herd/`);
  assert.equal(
    new URL(links[3].href).searchParams.get("subject"),
    `${title} — Lookout West`,
  );
  for (const link of links.slice(0, 3))
    assert.equal([...new URL(link.href).searchParams].length, 1);
});

test("every editorial page has one complete server-rendered metadata set and public image", async (t) => {
  const articles = (await readdir("dist/research", { withFileTypes: true }))
    .filter((x) => x.isDirectory() && x.name !== "topics")
    .map((x) => `/research/${x.name}/`);
  const editions = (await readdir("dist/current", { withFileTypes: true }))
    .filter((x) => x.isDirectory())
    .map((x) => `/current/${x.name}/`);
  const previews = new Set();
  for (const path of [...articles, ...editions, "/current/"]) {
    const { doc } = fixture(t, {
      markup: await readFile(`dist${path}index.html`, "utf8"),
      enhance: false,
    });
    const meta = (key, attr = "property") => {
      const tags = doc.querySelectorAll(`meta[${attr}="${key}"]`);
      assert.equal(tags.length, 1, `${path}: ${key}`);
      assert.ok(tags[0].content.trim(), `${path}: nonempty ${key}`);
      return tags[0].content;
    };
    assert.equal(doc.querySelectorAll("link[rel=canonical]").length, 1);
    assert.equal(
      doc.querySelector("link[rel=canonical]").href,
      `${origin}${path}`,
    );
    assert.equal(meta("og:url"), `${origin}${path}`);
    assert.equal(meta("og:site_name"), "Lookout West");
    assert.equal(meta("og:type"), path === "/current/" ? "website" : "article");
    assert.equal(meta("twitter:card", "name"), "summary_large_image");
    for (const key of ["title", "description", "image", "image:alt"])
      assert.equal(meta(`og:${key}`), meta(`twitter:${key}`, "name"));
    assert.ok(meta("og:description").length > 30);
    assert.doesNotMatch(meta("robots", "name"), /noindex/);
    const url = new URL(meta("og:image"));
    assert.equal(url.protocol, "https:");
    assert.equal(url.origin, origin);
    assert.match(url.pathname, /-[a-f0-9]{12}\.(jpg|png|webp)$/);
    assert.ok(
      !previews.has(url.href),
      `${path} must not inherit another page's image`,
    );
    previews.add(url.href);
    const data = await sharp(`dist${decodeURIComponent(url.pathname)}`).metadata();
    assert.equal(meta("og:image:width"), "1200");
    assert.equal(meta("og:image:height"), "630");
    assert.equal(data.width, 1200);
    assert.equal(data.height, 630);
    if (path.startsWith("/current/") && path !== "/current/") {
      const date = path.split("/")[2];
      assert.equal(meta("article:published_time"), `${date}T00:00:00.000Z`);
      assert.match(url.pathname, new RegExp(date));
      assert.ok(
        meta("og:title").includes(
          new Intl.DateTimeFormat("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(date)),
        ),
      );
    }
    assert.equal(
      doc.querySelectorAll(".share-image-preview, [data-image-helper] img")
        .length,
      0,
      "Large Instagram assets must not preload",
    );
  }
});

test("latest and archived Current copies always use their edition permalink at both placements", async (t) => {
  const dates = (await readdir("dist/current", { withFileTypes: true }))
    .filter((x) => x.isDirectory())
    .map((x) => x.name)
    .sort()
    .reverse();
  for (const [path, date] of [
    ["/current/", dates[0]],
    ...dates.map((d) => [`/current/${d}/`, d]),
  ]) {
    const { win, doc } = fixture(t, {
      markup: await readFile(`dist${path}index.html`, "utf8"),
    });
    const copied = [];
    Object.defineProperty(win.navigator, "clipboard", {
      value: { writeText: async (value) => copied.push(value) },
    });
    const groups = [...doc.querySelectorAll("[data-share-actions]")];
    assert.equal(groups.length, 2);
    for (const group of groups) {
      assert.equal(
        group.querySelector("[data-share-trigger]").textContent,
        "Share this edition",
      );
      group.querySelector("[data-copy-link]").click();
      await settle();
    }
    assert.deepEqual(copied, Array(2).fill(`${origin}/current/${date}/`));
    for (const link of doc.querySelectorAll("[data-image-helper] a[download]"))
      assert.ok(
        (await readFile(`dist${link.getAttribute("href")}`)).length > 0,
      );
  }
});

test("unsupported payloads fall back and file assets load only after expanding Instagram", async (t) => {
  const { win, doc, group } = fixture(t, { enhance: false });
  let fetches = 0;
  let shares = 0;
  win.navigator.share = () => {
    shares++;
    return Promise.resolve();
  };
  win.navigator.canShare = () => false;
  win.fetch = async () => {
    fetches++;
    return new win.Response("unavailable", { status: 404 });
  };
  initializeShareActions(doc);
  group.querySelector("[data-share-trigger]").click();
  const dialog = doc.querySelector(".share-dialog");
  assert.equal(dialog.open, true);
  assert.equal(shares, 0);
  assert.equal(fetches, 0);
  const helper = dialog.querySelector("[data-image-helper]");
  helper.open = true;
  helper.dispatchEvent(new win.Event("toggle"));
  await settle();
  assert.ok(fetches > 0);
  assert.equal(helper.querySelector("[data-share-image]").hidden, true);
  assert.equal(helper.querySelectorAll("a[download]").length, 2);
});

test("navigation cleanup removes dialogs and duplicate handlers before reinitialization", async (t) => {
  const { win, doc, group, trigger } = fixture(t, { mobile: true });
  trigger.click();
  cleanupShareActions(doc);
  assert.equal(doc.querySelectorAll("dialog.share-dialog").length, 0);
  assert.equal(
    doc.documentElement.classList.contains("has-share-dialog"),
    false,
  );
  let copies = 0;
  Object.defineProperty(win.navigator, "clipboard", {
    value: {
      writeText: async () => {
        copies++;
      },
    },
  });
  initializeShareActions(doc);
  group.querySelector("[data-copy-link]").click();
  await settle();
  assert.equal(copies, 1);
  assert.equal(
    doc.querySelectorAll("dialog.share-dialog").length,
    doc.querySelectorAll("[data-share-actions]").length,
  );
});
