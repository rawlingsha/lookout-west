import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { Window } from "happy-dom";
import { currentSchema } from "../src/lib/current-schema.ts";
const fixture = JSON.parse(
  await readFile("tests/fixtures/current.json", "utf8"),
);

test("edition schema accepts five to seven signals and rejects broken dates, fragments and unsafe links", () => {
  assert.equal(currentSchema.parse(fixture).signals.length, 7);
  assert.equal(
    currentSchema.parse({ ...fixture, signals: fixture.signals.slice(0, 5) })
      .signals.length,
    5,
  );
  for (const value of [
    { ...fixture, date: "2026-02-30" },
    { ...fixture, signals: fixture.signals.slice(0, 4) },
    { ...fixture, signals: [...fixture.signals, fixture.signals[0]] },
    {
      ...fixture,
      signals: fixture.signals.map((s) => ({ ...s, id: "duplicate" })),
    },
    {
      ...fixture,
      signals: fixture.signals.map((s) => ({
        ...s,
        source: { label: "unsafe", url: "javascript:alert(1)" },
      })),
    },
  ])
    assert.equal(currentSchema.safeParse(value).success, false);
});

test("production does not expose development fixtures or draft editions", async () => {
  const names = await readdir("dist/current");
  assert.ok(!names.includes("preview"));
  const files = (await readdir("src/content/current")).filter((name) =>
    name.endsWith(".json"),
  );
  for (const file of files) {
    const edition = JSON.parse(
      await readFile(`src/content/current/${file}`, "utf8"),
    );
    if (edition.draft) assert.ok(!names.includes(edition.date));
  }
  for (const path of [
    "dist/index.html",
    "dist/current/index.html",
    "dist/sitemap-0.xml",
  ])
    assert.doesNotMatch(
      await readFile(path, "utf8"),
      /Development fixture|layout-signal-|\/current\/preview\//,
    );
});

test("Current integrates with navigation, homepage order, canonical metadata and one existing modal", async (t) => {
  const win = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  t.after(() => win.happyDOM.close());
  win.document.write(await readFile("dist/index.html", "utf8"));
  const doc = win.document;
  assert.deepEqual(
    [...doc.querySelectorAll(".site-header__nav a")].map((a) =>
      a.textContent.trim(),
    ),
    ["Research", "The Current", "Services", "About", "Contact"],
  );
  assert.deepEqual(
    [...doc.querySelectorAll(".mobile-menu__list a")].map((a) =>
      a.textContent.trim(),
    ),
    ["Research", "The Current", "Services", "About", "Contact"],
  );
  assert.equal(
    doc.querySelector(".hero").nextElementSibling.className,
    "current-preview",
  );
  assert.ok(
    doc
      .querySelector(".current-preview")
      .nextElementSibling.classList.contains("front-section"),
  );
  doc.open();
  doc.write(await readFile("dist/current/index.html", "utf8"));
  doc.close();
  assert.equal(doc.querySelectorAll("h1").length, 1);
  assert.equal(doc.querySelectorAll("#subscribe-modal").length, 1);
  assert.equal(
    doc.querySelector("link[rel=canonical]").href,
    "https://lookoutwest.us/current/",
  );
  assert.equal(
    doc
      .querySelector(".site-header__nav a[aria-current=page]")
      .textContent.trim(),
    "The Current",
  );
  assert.ok(doc.querySelector("#past-editions"));
});

test("published editions have dated metadata, ordered signals and chronological archive links", async (t) => {
  const win = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  t.after(() => win.happyDOM.close());
  const files = (await readdir("src/content/current")).filter((name) =>
    name.endsWith(".json"),
  );
  const editions = (
    await Promise.all(
      files.map(async (name) =>
        currentSchema.parse(
          JSON.parse(await readFile(`src/content/current/${name}`, "utf8")),
        ),
      ),
    )
  )
    .filter((edition) => !edition.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const edition of editions) {
    const doc = win.document;
    doc.open();
    doc.write(
      await readFile(`dist/current/${edition.date}/index.html`, "utf8"),
    );
    doc.close();
    assert.equal(
      doc.querySelector("link[rel=canonical]").href,
      `https://lookoutwest.us/current/${edition.date}/`,
    );
    assert.equal(
      doc.querySelector('meta[property="og:type"]').content,
      "article",
    );
    assert.equal(
      doc.querySelector('meta[property="og:url"]').content,
      `https://lookoutwest.us/current/${edition.date}/`,
    );
    assert.equal(
      doc.querySelector("meta[name=description]").content,
      edition.deck ?? edition.signals[0].headline,
    );
    assert.deepEqual(
      [...doc.querySelectorAll(".current-signals > li")].map((li) => li.id),
      edition.signals.map((s) => s.id),
    );
    assert.equal(
      doc
        .querySelector(".site-header__nav a[aria-current=page]")
        .textContent.trim(),
      "The Current",
    );
    assert.equal(
      doc
        .querySelector(".mobile-menu__list a[aria-current=page]")
        .textContent.trim(),
      "The Current",
    );
    assert.ok(doc.querySelector(".current-completion [data-subscribe-open]"));
  }
  const doc = win.document;
  doc.open();
  doc.write(await readFile("dist/current/index.html", "utf8"));
  doc.close();
  assert.deepEqual(
    [...doc.querySelectorAll(".current-archive a")].map((a) =>
      a.getAttribute("href"),
    ),
    editions.slice(1).map((e) => `/current/${e.date}/`),
  );
  if (editions.length)
    assert.equal(
      doc.querySelector(".current-signals h2").textContent,
      editions[0].signals[0].headline,
    );
});
