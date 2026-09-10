import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { Window } from "happy-dom";
import sharp from "sharp";
import { parse } from "yaml";
import { contentUrl } from "../src/lib/urls.ts";
import { shareDestinations } from "../src/lib/share.ts";
import { initializeShareActions } from "../src/scripts/share-actions.ts";

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
  const trigger = group.querySelector("summary");
  const dialog = win.document.querySelector("dialog");
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
    payload.title,
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
    name.endsWith(".mdx"),
  )) {
    const id = file.replace(/\.mdx$/, "");
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
    assert.equal(meta("og:title"), doc.querySelector("h1").textContent);
    assert.equal(meta("og:url"), `${origin}/research/${id}/`);
    assert.equal(doc.querySelector("link[rel=canonical]").href, meta("og:url"));
    assert.ok(meta("og:image:alt"));
    assert.ok(meta("article:published_time"));
    const image = new URL(meta("og:image"));
    previews.add(image.pathname);
    const imageData = await sharp(`dist${image.pathname}`).metadata();
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

test("chart pages have their own metadata and return to real article anchors", async (t) => {
  for (const [article, figure] of [
    ["west-growth-drivers", "growth-drivers"],
    ["taxes-in-the-west", "tax-bases"],
  ]) {
    const url = `/visualizations/${article}/${figure}/`;
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
        .content.includes(`/figures/${figure}-preview.jpg`),
    );
    assert.ok(
      doc.querySelector(
        `a[href="${origin}/research/${article}/#figure-${figure}"]`,
      ),
    );
    const articleDoc = fixture(t, {
      markup: await readFile(`dist/research/${article}/index.html`, "utf8"),
      enhance: false,
    }).doc;
    assert.ok(articleDoc.getElementById(`figure-${figure}`));
    assert.ok(
      articleDoc.querySelector(
        `[data-share-actions][data-url="${origin}${url}"]`,
      ),
    );
    assert.equal(
      (await sharp(`dist/social/generated/figures/${figure}.png`).metadata())
        .width,
      1080,
    );
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
  assert.equal(doc.querySelectorAll("dialog").length, 0);
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
    doc.querySelectorAll("dialog").length,
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
  const end = doc.querySelectorAll("[data-share-disclosure] > summary")[2];
  end.click();
  assert.equal(dialog.open, false);
  assert.equal(doc.querySelectorAll("dialog[open]").length, 1);
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

test("native sharing hides when absent and handles cancellation/failure", async (t) => {
  const missing = fixture(t);
  assert.equal(
    missing.dialog.querySelector("[data-native-share]").hidden,
    true,
  );
  const { win, doc, group } = fixture(t, { enhance: false });
  const calls = [];
  let failure = Object.assign(new Error("Canceled"), { name: "AbortError" });
  win.navigator.share = async (payload) => {
    calls.push(payload);
    if (failure) throw failure;
  };
  initializeShareActions(doc);
  const button = doc.querySelector("dialog [data-native-share]");
  group.querySelector("summary").click();
  button.click();
  await settle();
  assert.equal(button.hidden, false);
  assert.equal(calls[0].url, `${origin}${articlePath}`);
  assert.equal(doc.querySelector("dialog [data-panel-status]").textContent, "");
  failure = new Error("Not allowed");
  button.click();
  await settle();
  assert.match(
    doc.querySelector("dialog [data-panel-status]").textContent,
    /copy the link/,
  );
  assert.equal(button.disabled, false);
  failure = null;
  button.click();
  await settle();
  assert.equal(doc.querySelector("dialog [data-panel-status]").textContent, "");
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
  group.querySelector("summary").click();
  const helper = doc.querySelector("dialog [data-image-helper]");
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
