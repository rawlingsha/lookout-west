import { enhancePersonal } from "../src/lib/interactive/energy/personal.ts";
import { statePriceRows, fuelDistribution } from "../src/lib/interactive/energy/personal-model.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { Window } from "happy-dom";
import sharp from "sharp";
import { enhanceHeroFilm } from "../src/lib/interactive/energy/hero-film.ts";
import { setSupplyStage } from "../src/lib/interactive/energy/supply.ts";
import { rebaseCpi, pulseSvg, pulseChange } from "../src/lib/interactive/energy/pulse-model.ts";
import { enhanceOutlook } from "../src/lib/interactive/energy/outlook.ts";
import { outlookStates, outlookToday, outlookCases, outlookGeometry } from "../src/lib/interactive/energy/outlook-data.ts";
import { enhanceFiscal } from "../src/lib/interactive/energy/fiscal.ts";
import { enhancePulse } from "../src/lib/interactive/energy/pulse.ts";
import {
  assertSnapshot,
  validateBudget,
  fuelBudget,
  signedMoney,
  fiscalSensitivity,
  roundedFiscalMagnitude,
  resolveSupplyStep,
  sortPrices,
} from "../src/lib/interactive/energy/model.ts";
import {
  initializeEnergy,
  enhanceBudget,
  enhanceSupply,
} from "../src/lib/interactive/energy/enhance.ts";

const snapshot = JSON.parse(
  await readFile("src/data/interactive/west-energy-bill/snapshot.json", "utf8"),
);
const html = await readFile(
  "dist/research/west-energy-bill/index.html",
  "utf8",
);
function fixture(t, hash = "") {
  const win = new Window({
    url: `https://lookoutwest.us/research/west-energy-bill/${hash}`,
    width: 1280,
    height: 900,
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  win.document.write(html);
  t.after(() => win.happyDOM.close());
  return { win, doc: win.document };
}

test("hero motion respects reduced motion and data saving before requesting video", async (t) => {
  for (const preference of ["reduced", "saveData", "normal"]) {
    const { win, doc } = fixture(t);
    const root = doc.querySelector("[data-energy-film]");
    const video = root.querySelector("video");
    const media = new win.EventTarget();
    media.matches = preference === "reduced";
    win.matchMedia = () => media;
    Object.defineProperty(win.navigator, "connection", {
      value: { saveData: preference === "saveData" },
    });
    let plays = 0;
    video.play = async () => {
      plays++;
      video.dispatchEvent(new win.Event("playing"));
    };
    video.pause = () => {};
    video.load = () => {};
    const cleanup = enhanceHeroFilm(root);
    assert.equal(enhanceHeroFilm(root), cleanup, "initialization is idempotent");
    if (preference !== "normal") {
      assert.equal(plays, 0);
      assert.equal(video.hasAttribute("src"), false);
      assert.equal(video.hidden, true);
    } else {
      assert.equal(plays, 1);
      assert.equal(video.muted, true);
      assert.equal(video.hidden, false);
      assert.equal(video.loop, false);
      media.matches = true;
      media.dispatchEvent(new win.Event("change"));
      assert.equal(video.hidden, true);
      assert.equal(video.hasAttribute("src"), false);
    }
    cleanup();
  }
});

test("blocked hero autoplay retains the video-derived still without an unhandled rejection", async (t) => {
  const { win, doc } = fixture(t);
  const root = doc.querySelector("[data-energy-film]");
  const video = root.querySelector("video");
  const media = new win.EventTarget();
  media.matches = false;
  win.matchMedia = () => media;
  video.play = () => Promise.reject(new Error("Autoplay blocked"));
  video.pause = () => {};
  const cleanup = enhanceHeroFilm(root);
  await Promise.resolve();
  assert.equal(video.hidden, true);
  assert.match(root.querySelector("[data-film-still]").src, /desert_ship-video-poster/);
  assert.equal(root.querySelector("[data-film-still]").hidden, false);
  assert.equal(root.querySelector('img[src$=".svg"]'), null);
  cleanup();
});

test("snapshot rejects missing/duplicate states, bad vintages, nonfinite values and wrong units", () => {
  assert.doesNotThrow(() => assertSnapshot(snapshot));
  for (const mutate of [
    (d) => d.metrics[0].rows.pop(),
    (d) => (d.metrics[0].rows[0].code = "AZ"),
    (d) => (d.metrics[2].unit = "USD/kWh"),
    (d) => (d.metrics[2].observationPeriod = "September 2026"),
    (d) => (d.metrics[0].rows[0].value = NaN),
    (d) => (d.metrics[0].rows[0].value = -1),
  ]) {
    const data = structuredClone(snapshot);
    mutate(data);
    assert.throws(() => assertSnapshot(data));
  }
  assert.equal(sortPrices(snapshot.metrics[0].rows)[0].code, "CA");
  assert.equal(sortPrices(snapshot.metrics[2].rows)[0].code, "HI");
});

test("fuel arithmetic covers positive, negative, zero and boundaries; agrees with independent R fixtures", async () => {
  const rows = (
    await readFile(
      "analysis/quarterly/west-energy-bill/budget-fixtures.csv",
      "utf8",
    )
  )
    .trim()
    .split("\n")
    .slice(1);
  for (const row of rows) {
    const [gallons, cents, monthly] = row.split(",").map(Number);
    assert.deepEqual(fuelBudget(gallons, cents), {
      monthlyCents: monthly,
      twoMonthCents: 2 * monthly,
    });
  }
  assert.equal(signedMoney(-3000), "−$30");
  assert.equal(signedMoney(0), "$0");
  assert.equal(signedMoney(5), "+$0.05");
  for (const [g, p] of [
    ["", "1"],
    [" ", "1"],
    ["Infinity", "1"],
    ["60", "NaN"],
    ["60", ""],
    ["-1", "1"],
    ["501", "1"],
    ["60.1", "1"],
    ["60", "2.05"],
    ["60", "-2.05"],
    ["60", "0.03"],
    ["60", "0.051"],
  ])
    assert.equal(validateBudget(g, p).valid, false, `${g},${p}`);
  assert.deepEqual(validateBudget("80", "0.50"), {
    valid: true,
    gallons: 80,
    deltaCents: 50,
  });
  assert.throws(() => fuelBudget(60, 3));
});

test("fiscal illustration preserves annual units and symmetric rounding", () => {
  assert.deepEqual(
    [-10, 0, 10].map((x) => fiscalSensitivity(x)),
    [-564.5, 0, 564.5],
  );
  assert.deepEqual(
    [-564.5, 0, 564.5].map(roundedFiscalMagnitude),
    [565, 0, 565],
  );
  assert.throws(() => fiscalSensitivity(Infinity));
});

test("all 39 plotted state prices match the archived source transcription", async () => {
  const csv = await readFile(
    "analysis/quarterly/west-energy-bill/input/state-prices.csv",
    "utf8",
  );
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [code, name, ...values] = line.split(",");
    snapshot.metrics.forEach((metric, index) => {
      const row = metric.rows.find((row) => row.code === code);
      assert.equal(row.name, name);
      assert.equal(row.value, Number(values[index]), `${code} ${metric.id}`);
    });
  }
});

test("static article has useful fallbacks, one shell, sources, and published metadata", async (t) => {
  const { doc } = fixture(t);
  assert.equal(doc.querySelectorAll("h1").length, 1);
  assert.equal(doc.querySelectorAll("main").length, 1);
  assert.equal(doc.querySelectorAll(".site-header").length, 1);
  assert.equal(doc.querySelector("[data-metric-controls]").hidden, true);
  assert.equal(doc.querySelector("[data-budget-controls]").hidden, true);
  assert.equal(doc.querySelector("[data-budget-fallback]").hidden, false);
  assert.equal(
    doc.querySelectorAll("[data-state-dot]").length,
    13,
  );
  assert.equal(doc.querySelectorAll("[data-supply-step]").length, 4);
  assert.equal(doc.querySelector("[data-supply-sticky]").hidden, true);
  assert.match(
    doc.querySelector("[data-budget-fallback]").textContent,
    /\$120/,
  );
  const ids = [...doc.querySelectorAll("[id]")].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, "IDs are unique");
  for (const anchor of doc.querySelectorAll('.energy-story a[href^="#"]'))
    assert.ok(doc.getElementById(anchor.hash.slice(1)), anchor.hash);
  assert.equal(
    doc.querySelector('link[rel="canonical"]').href,
    "https://lookoutwest.us/research/west-energy-bill/",
  );
  for (const file of [
    "dist/research/index.html",
    "dist/research/topics/energy/index.html",
    "dist/rss.xml",
    "dist/sitemap-0.xml",
  ])
    assert.match(await readFile(file, "utf8"), /west-energy-bill/);
});

test("fuel switching preserves state, updates semantic distribution and keeps a common axis", (t) => {
  const { win, doc } = fixture(t);
  initializeEnergy(doc); initializeEnergy(doc);
  const root=doc.querySelector('[data-energy-personal]');
  const nodes=[...root.querySelectorAll('[data-state-dot]')];
  const select=root.querySelector('[data-state-select]');
  assert.equal(root.querySelector('[data-selection-label]').textContent,'Example state');
  for(const code of ['NM','CO','CA','WY']) {
    select.value=code;select.dispatchEvent(new win.Event('change',{bubbles:true}));
    for(const id of ['gasoline','diesel']) {
      const radio=root.querySelector(`[value="${id}"]`); radio.checked=true;radio.dispatchEvent(new win.Event('change',{bubbles:true}));
      const d=fuelDistribution(snapshot.metrics,id,code);
      assert.equal(root.querySelector('[data-selected-name]').textContent,d.selected.name);
      assert.equal(root.querySelector('[data-selected-value]').textContent,`$${d.selected.value.toFixed(2)}`);
      assert.equal(root.querySelector('[data-selected-code]').textContent,code);
      assert.match(root.querySelector('[data-position]').textContent,new RegExp(`^${d.rank} of 13`));
      assert.equal(root.querySelector('[data-selected-marker]').style.left,`${d.selected.x}%`);
      assert.deepEqual([...root.querySelectorAll('[data-state-dot]')],nodes);
      assert.equal(select.value,code);
    }
  }
  assert.equal(root.querySelector('[data-selection-label]').textContent,'Selected state');
  assert.equal(root.querySelector('[value="electricity"]'),null);
  assert.equal(doc.querySelectorAll('.personal-data tbody tr').length,13);
  assert.equal(doc.querySelector('#energy-price').value,'1.00');
});

test("chart return links open the regional disclosure on initial load and hash navigation", (t) => {
  const { win, doc } = fixture(t, "#figure-energy-electricity");
  initializeEnergy(doc);
  for(const id of ['electricity','diesel']) {
    win.location.hash=`#figure-energy-${id}`;win.dispatchEvent(new win.Event('hashchange'));
    let parent=doc.getElementById(`figure-energy-${id}`).parentElement;
    while(parent){if(parent.tagName==='DETAILS') assert.equal(parent.open,true);parent=parent.parentElement;}
  }
});

test("calculator updates, rejects invalid input, restores values, and resets", async (t) => {
  const { win, doc } = fixture(t);
  initializeEnergy(doc);
  const gallons = doc.querySelector("#energy-gallons"),
    price = doc.querySelector("#energy-price");
  const set = (g, p) => {
    gallons.value = g;
    price.value = p;
    price.dispatchEvent(new win.Event("input", { bubbles: true }));
  };
  set("80", "0.50");
  assert.equal(doc.querySelector("[data-monthly]").textContent, "+$40");
  assert.equal(doc.querySelector("[data-two-month]").textContent, "+$80");
  set("60", "-0.50");
  assert.match(
    doc.querySelector("[data-budget-description]").textContent,
    /saves \$30/,
  );
  set("0", "1");
  assert.equal(doc.querySelector("[data-monthly]").textContent, "$0");
  assert.match(
    doc.querySelector("[data-budget-description]").textContent,
    /zero gallons/,
  );
  set("60", "0");
  assert.match(
    doc.querySelector("[data-budget-description]").textContent,
    /unchanged/,
  );
  set("", "1");
  assert.equal(doc.querySelector("[data-budget-result]").hidden, true);
  assert.equal(gallons.getAttribute("aria-invalid"), "true");
  assert.equal(doc.querySelector("#gallons-error").hidden, false);
  set("60", "0.03");
  assert.equal(price.getAttribute("aria-invalid"), "true");
  doc.querySelector("[data-budget-reset]").click();
  assert.equal(gallons.value, "60");
  assert.equal(price.value, "1.00");
  assert.equal(doc.querySelector("[data-budget-result]").hidden, false);
  doc.querySelector('[data-price-preset="-0.50"]').click();
  assert.equal(doc.querySelector("[data-monthly]").textContent, "−$30");
  gallons.value = "80";
  price.value = "0.50";
  win.dispatchEvent(new win.Event("pageshow"));
  assert.equal(doc.querySelector("[data-monthly]").textContent, "+$40");
  assert.equal(win.localStorage.length, 0);
  assert.equal(win.sessionStorage.length, 0);
  assert.equal(win.location.search, "");
});

test("restored invalid inputs show errors at initialization; independent modules can recover", (t) => {
  const { doc } = fixture(t);
  doc.querySelector("#energy-gallons").value = "";
  const budget = doc.querySelector("[data-energy-budget]");
  const cleanup = enhanceBudget(budget);
  assert.equal(doc.querySelector("[data-budget-result]").hidden, true);
  cleanup();
  assert.equal(doc.querySelector("[data-budget-fallback]").hidden, false);
  doc.querySelector("[data-metric-controls]").remove();
  assert.throws(() =>
    enhancePersonal(doc.querySelector("[data-energy-personal]")),
  );
  assert.equal(
    doc.querySelectorAll("[data-state-dot]").length,
    13,
  );
});

test("deterministic supply resolver handles forward, fast and reverse scrolling", () => {
  assert.equal(resolveSupplyStep([300, 800, 1300, 1800], 180), 0);
  assert.equal(resolveSupplyStep([-1300, -800, -300, 200], 180), 2);
  assert.equal(resolveSupplyStep([-1400, -900, -400, 100], 180), 3);
  assert.equal(resolveSupplyStep([-100, 400, 900, 1400], 180), 0);
});

test("sticky supply follows its 45-percent trigger and restores ordinary flow below the breakpoint", (t) => {
  const { win, doc } = fixture(t);
  const root = doc.querySelector("[data-energy-supply]");
  const media = new win.EventTarget();
  media.matches = true;
  win.matchMedia = () => media;
  let observer;
  let disconnected = 0;
  win.IntersectionObserver = class {
    constructor(callback) {
      observer = callback;
    }
    observe() {}
    disconnect() {
      disconnected++;
    }
  };
  const headings = [...root.querySelectorAll("[data-supply-step] h3")];
  let tops = [0, 500, 1000, 1500];
  headings.forEach((el, i) => {
    el.getBoundingClientRect = () => ({ top: tops[i] });
  });
  const cleanup = enhanceSupply(root);
  assert.equal(root.classList.contains("is-sticky"), true);
  assert.equal(root.dataset.activeStep, "0");
  tops = [-1600, -1100, -600, -100];
  observer();
  assert.equal(root.dataset.activeStep, "3");
  tops = [-600, -100, 500, 1100];
  observer();
  assert.equal(root.dataset.activeStep, "1");
  media.matches = false;
  media.dispatchEvent(new win.Event("change"));
  assert.equal(root.classList.contains("is-sticky"), false);
  assert.equal(root.querySelector("[data-supply-sticky]").hidden, true);
  assert.ok(disconnected > 0);
  media.matches = true;
  media.dispatchEvent(new win.Event("change"));
  assert.equal(root.dataset.activeStep, "1");
  cleanup();
  assert.equal(root.classList.contains("is-sticky"), false);
});

test("observer failure restores all static explanations without breaking other modules", (t) => {
  const { win, doc } = fixture(t);
  const media = new win.EventTarget();
  media.matches = true;
  win.matchMedia = () => media;
  let disconnected = 0;
  win.IntersectionObserver = class {
    observe() {
      throw new Error("Observer unavailable");
    }
    disconnect() {
      disconnected++;
    }
  };
  const cleanup = initializeEnergy(doc);
  const supply = doc.querySelector("[data-energy-supply]");
  assert.equal(supply.classList.contains("is-sticky"), false);
  assert.equal(supply.querySelector("[data-supply-sticky]").hidden, true);
  assert.equal(supply.querySelectorAll(".energy-supply-static").length, 4);
  assert.ok(disconnected > 0);
  assert.equal(doc.querySelector("[data-budget-controls]").hidden, false);
  assert.equal(doc.querySelector("[data-metric-controls]").hidden, false);
  cleanup();
});

test("compact viewports keep ordinary reading flow until the route diagram is eligible", (t) => {
  const { win, doc } = fixture(t);
  const media = new win.EventTarget();
  media.matches = false;
  win.matchMedia = () => media;
  let observed = false;
  win.IntersectionObserver = class {
    observe() {
      observed = true;
    }
    disconnect() {}
  };
  const root = doc.querySelector("[data-energy-supply]");
  const cleanup = enhanceSupply(root);
  assert.equal(root.classList.contains("is-sticky"), false);
  assert.equal(root.querySelector("[data-supply-sticky]").hidden, true);
  assert.equal(observed, false);
  media.matches = true;
  media.dispatchEvent(new win.Event("change"));
  assert.equal(root.classList.contains("is-sticky"), true);
  assert.equal(observed, true);
  cleanup();
});

test("selected state, personal result and conditional path update without persistence", (t) => {
  const { win, doc } = fixture(t);
  initializeEnergy(doc);
  const state = doc.querySelector("[data-state-select]");
  state.value = "CA";
  state.dispatchEvent(new win.Event("change", { bubbles: true }));
  assert.equal(doc.querySelector('[data-energy-personal] [data-selected-name]').textContent, "California");
  assert.equal(doc.querySelector('[data-energy-personal] [data-selected-value]').textContent, "$6.14");
  const gallons = doc.querySelector("#energy-gallons");
  gallons.value = "80";
  doc.querySelector("#energy-price").value = "0.50";
  gallons.dispatchEvent(new win.Event("input", { bubbles: true }));
  assert.equal(doc.querySelector("[data-monthly]").textContent, "+$40");
  assert.equal(doc.querySelector("[data-budget-mirror]"), null);
  assert.match(doc.querySelector(".energy-fiscal__sensitivity").textContent, /About \+\$565m/);
  doc.querySelector('[data-outlook-select="recovery"]').click();
  assert.equal(doc.querySelector('[data-outlook-select="recovery"]').checked, true);
  assert.equal(doc.querySelector("[data-energy-outlook]").dataset.outlookState, "recovery");
  assert.match(doc.querySelector("[data-outlook-status]").textContent, /gasoline can ease before diesel/i);
  assert.equal(win.localStorage.length, 0);
  assert.equal(win.sessionStorage.length, 0);
});

test("print opens data notes, preserves valid calculator state and restores disclosures afterward", (t) => {
  const { win, doc } = fixture(t);
  const notes = [...doc.querySelectorAll("details.energy-data")];
  notes[0].open = true;
  const cleanup = initializeEnergy(doc);
  const gallons = doc.querySelector("#energy-gallons");
  gallons.value = "80";
  doc.querySelector("#energy-price").value = "0.50";
  gallons.dispatchEvent(new win.Event("input", { bubbles: true }));
  win.dispatchEvent(new win.Event("beforeprint"));
  win.dispatchEvent(new win.Event("beforeprint"));
  assert.ok(notes.every((note) => note.open));
  assert.equal(doc.querySelector("[data-two-month]").textContent, "+$80");
  assert.equal(
    doc.querySelectorAll("details.share-disclosure[open]").length,
    0,
  );
  win.dispatchEvent(new win.Event("afterprint"));
  assert.equal(notes[0].open, true);
  assert.ok(notes.slice(1).every((note) => !note.open));
  win.dispatchEvent(new win.Event("beforeprint"));
  cleanup();
  assert.ok(notes.slice(1).every((note) => !note.open));
});

test("history restore updates fuel and state from restored controls", (t) => {
  const { win, doc } = fixture(t); initializeEnergy(doc);
  doc.querySelector('input[name="energy-metric"][value="diesel"]').checked=true;
  doc.querySelector('[data-state-select]').value='CA';
  win.dispatchEvent(new win.Event('pageshow'));
  assert.equal(doc.querySelector('[data-energy-personal]').dataset.fuel,'diesel');
  assert.equal(doc.querySelector('[data-selected-value]').textContent,'$8.42');
});

test("all five energy figures have downloads, dedicated share pages and real return anchors", async (t) => {
  const { doc } = fixture(t);
  const figures = JSON.parse(
    await readFile("src/data/share-figures.json", "utf8"),
  ).filter((f) => f.article === "west-energy-bill");
  assert.equal(figures.length, 5);
  for (const figure of figures) {
    const block = doc.getElementById(`figure-${figure.id}`);
    assert.ok(block);
    assert.ok(block.querySelector("[data-energy-plot]"));
    const url = `/visualizations/west-energy-bill/${figure.id}/`;
    assert.equal(
      block.querySelector("[data-share-actions]").dataset.url,
      `https://lookoutwest.us${url}`,
    );
    assert.ok(block.querySelector(`a[href="${figure.image}"]`));
    const metadata = await sharp(
      `dist/social/generated/figures/${figure.id}.png`,
    ).metadata();
    assert.equal(metadata.width, 1200);
    const page = await readFile(`dist${url}index.html`, "utf8");
    assert.ok(page.includes(`#figure-${figure.id}`));
    assert.ok(page.includes(`/figures/${figure.id}-preview.jpg`));
  }
});

test("production has external executable scripts and stays within issue asset budgets", async (t) => {
  const { doc } = fixture(t);
  for (const script of doc.scripts) {
    assert.ok(script.getAttribute("src"));
    assert.equal(script.textContent.trim(), "");
  }
  assert.equal(
    doc.querySelectorAll("[onclick],[oninput],[onchange]").length,
    0,
  );
  const files = await readdir("dist/_astro");
  const js = files.filter(
    (f) => f.startsWith("EnergyStory.") && f.endsWith(".js"),
  );
  const css = files.filter(
    (f) => f.startsWith("west-energy-bill.") && f.endsWith(".css"),
  );
  assert.equal(js.length, 1);
  assert.equal(css.length, 1);
  assert.ok(
    gzipSync(await readFile("dist/_astro/" + js[0])).length < 40 * 1024,
  );
  assert.ok(
    gzipSync(await readFile("dist/_astro/" + css[0])).length < 15 * 1024,
  );
  assert.ok(
    gzipSync(await readFile("dist/downloads/west-energy-bill/snapshot.json"))
      .length <
      30 * 1024,
  );
  assert.match(await readFile("dist/_headers", "utf8"), /script-src 'self'/);
});

test("accumulating supply states are complete, reversible and do not expose future concepts", (t) => {
  const { doc } = fixture(t);
  const root = doc.querySelector("[data-energy-supply]");
  const sticky = root.querySelector("[data-supply-sticky]");
  const objects = [...sticky.querySelectorAll("[data-introduced]")];
  assert.ok(objects.length > 8, "persistent objects replace four completed stage groups");
  for (const stage of [0, 3, 2, 1, 0, 2, 3]) {
    setSupplyStage(root, stage);
    for (const object of objects) {
      const introduced = Number(object.dataset.introduced);
      assert.equal(object.dataset.state, introduced > stage ? "future" : introduced === stage ? "current" : "context");
      assert.equal(object.getAttribute("aria-hidden"), String(introduced > stage));
    }
    assert.equal(sticky.querySelector("[data-supply-progress]").textContent, `0${stage + 1} / 04`);
    assert.match(sticky.querySelector("title").textContent, new RegExp(`stage ${stage + 1} of 4`));
  }
  const staticDiagrams = [...root.querySelectorAll(".energy-supply-static svg")];
  assert.equal(staticDiagrams.length, 4);
  staticDiagrams.forEach((diagram, stage) => {
    for (const object of diagram.querySelectorAll("[data-introduced]"))
      assert.equal(object.dataset.state === "future", Number(object.dataset.introduced) > stage);
    assert.ok(diagram.querySelector("desc").textContent.length > 40);
  });
});

test("supply catches a fast skipped observer band, deep loading, resize, hash changes and keyboard focus", (t) => {
  const { win, doc } = fixture(t, "#refining");
  const root = doc.querySelector("[data-energy-supply]");
  const media = new win.EventTarget();
  media.matches = true;
  win.matchMedia = () => media;
  win.IntersectionObserver = class { observe() {} disconnect() {} };
  let queued;
  win.requestAnimationFrame = (callback) => { queued = callback; return 1; };
  win.cancelAnimationFrame = () => { queued = undefined; };
  const flush = () => { const callback = queued; queued = undefined; callback?.(); };
  let tops = [-1500, -800, 100, 800];
  [...root.querySelectorAll("[data-supply-step] h3")].forEach((heading, index) => {
    heading.getBoundingClientRect = () => ({ top: tops[index] });
  });
  const cleanup = enhanceSupply(root);
  assert.equal(root.dataset.activeStep, "2", "deep-load state follows existing scroll position");
  flush();
  tops = [-2000, -1300, -600, 50];
  win.dispatchEvent(new win.Event("scroll"));
  flush();
  assert.equal(root.dataset.activeStep, "3", "fast jump works without an observer notification");
  tops = [100, 800, 1500, 2200];
  win.dispatchEvent(new win.Event("scroll"));
  flush();
  assert.equal(root.dataset.activeStep, "0");
  tops = [-600, 50, 800, 1500];
  win.dispatchEvent(new win.Event("resize"));
  flush();
  assert.equal(root.dataset.activeStep, "1");
  assert.ok(root.classList.contains("is-sticky"));
  tops = [-1500, -800, 100, 800];
  win.dispatchEvent(new win.Event("hashchange"));
  flush();
  assert.equal(root.dataset.activeStep, "2");
  root.querySelector('[data-supply-step] a').dispatchEvent(new win.Event("focusin", { bubbles: true }));
  assert.equal(root.dataset.activeStep, "0");
  cleanup();
  assert.equal(root.querySelector("[data-supply-sticky]").hidden, true);
});

test("monthly BLS data reproduce official anchors and preserve the May peak", async () => {
  const { rows } = JSON.parse(await readFile("src/data/interactive/west-energy-bill/monthly-cpi.json", "utf8"));
  assert.deepEqual(rows[0], {month:"2026-02",gasoline:319.745,electricity:429.679,utilityGas:293.758});
  assert.deepEqual(rows[6], {month:"2026-08",gasoline:411.918,electricity:437.225,utilityGas:311.895});
  const rebased = rebaseCpi(rows);
  assert.deepEqual(["gasoline","electricity","utilityGas"].map(k=>pulseChange(rebased[1][k])), ["+22.6%","−1.0%","−2.2%"]);
  assert.deepEqual(["gasoline","electricity","utilityGas"].map(k=>pulseChange(rebased[6][k])), ["+28.8%","+1.8%","+6.2%"]);
  assert.equal(rebased[3].gasoline.toFixed(1), "140.8");
  assert.equal(Math.max(...rebased.map(r=>r.gasoline)), rebased[3].gasoline);
  assert.throws(()=>rebaseCpi(rows.slice(1)));
  assert.throws(()=>rebaseCpi(rows.map((r,i)=>i===3?{...r,gasoline:NaN}:r)));
  const svg = pulseSvg(rows,"test");
  assert.equal((svg.match(/data-pulse-series=/g)||[]).length,3);
  assert.ok(!/\b[CSQ]\d/.test(svg), "monthly paths use straight segments");
  assert.ok(svg.includes('>140</text>'), "common scale contains the actual peak");
  assert.ok(svg.includes("+28.8% since Feb."));
});

test("PricePulse reveals once on a common clock and keeps a complete static fallback", (t) => {
  const {win,doc}=fixture(t);
  const root=doc.querySelector('[data-energy-pulse]');
  assert.equal(root.querySelectorAll('tbody tr').length,7);
  assert.equal(root.querySelectorAll('[data-pulse-series]').length,6); // two responsive layouts, same data
  assert.equal(root.dataset.pulseState,undefined);
  root.querySelector('[data-pulse-visual]').getBoundingClientRect=()=>({top:1400});
  const media=new win.EventTarget(); media.matches=false; win.matchMedia=()=>media;
  let observer, options, complete;
  win.IntersectionObserver=class {constructor(cb,opts){observer=cb;options=opts;} observe(){} disconnect(){} };
  win.setTimeout=(cb)=>{complete=cb;return 1;}; win.clearTimeout=()=>{};
  const cleanup=enhancePulse(root);
  assert.equal(options.threshold,.3);
  assert.equal(root.dataset.pulseState,'pending');
  observer([{isIntersecting:true,intersectionRatio:.05}]);
  assert.equal(root.dataset.pulseState,'pending');
  observer([{isIntersecting:true,intersectionRatio:.4}]);
  assert.equal(root.dataset.pulseState,'revealing');
  complete();
  assert.equal(root.dataset.pulseState,'complete');
  observer([{isIntersecting:true,intersectionRatio:.4}]);
  assert.equal(root.dataset.pulseState,'complete');
  cleanup();
});

test("PricePulse honors reduced motion, delayed initialization, history restore and observer failure", (t) => {
  for(const mode of ['reduced','already-visible','history','failure']) {
    const {win,doc}=fixture(t); const root=doc.querySelector('[data-energy-pulse]');
    root.querySelector('[data-pulse-visual]').getBoundingClientRect=()=>({top:mode==='already-visible'?200:1400});
    const media=new win.EventTarget();media.matches=mode==='reduced';win.matchMedia=()=>media;
    win.IntersectionObserver=class {observe(){if(mode==='failure')throw Error('failed');}disconnect(){}};
    const cleanup=enhancePulse(root);
    if(mode==='history') {assert.equal(root.dataset.pulseState,'pending');const event=new win.Event('pageshow');event.persisted=true;win.dispatchEvent(event);}
    assert.equal(root.dataset.pulseState,'complete');
    cleanup();
  }
});

test("PricePulse restores an explicit chart anchor after initial layout without overriding history", (t) => {
  for (const navigationType of ['reload', 'back_forward']) {
    const {win,doc}=fixture(t, '#arrival-heading');
    const root=doc.querySelector('[data-energy-pulse]');
    let scrolls=0;
    doc.getElementById('arrival-heading').scrollIntoView=()=>{scrolls++;};
    win.performance.getEntriesByType=()=>[{type:navigationType}];
    const media=new win.EventTarget();media.matches=true;win.matchMedia=()=>media;
    win.IntersectionObserver=class {};
    const cleanup=enhancePulse(root);
    const initial=scrolls;
    const event=new win.Event('pageshow');event.persisted=false;win.dispatchEvent(event);
    if(navigationType==='reload') assert.ok(scrolls>=initial && initial===1);
    else assert.equal(scrolls,0);
    cleanup();
  }
});

test('fiscal mechanism keeps model evidence distinct from household spending and physical transport', (t) => {
  const {doc}=fixture(t);
  const section=doc.querySelector('[data-energy-fiscal]');
  assert.equal(section.querySelector('[role="img"]'), null);
  assert.equal(section.querySelector('[data-budget-mirror]'), null);
  assert.equal(section.querySelectorAll(':scope > header h2').length,1);
  assert.equal((section.textContent.match(/\?/g)||[]).length,1);
  for(const obsolete of ['THE SHARED PRICE','One barrel.','OUT / PAID NOW','IN / COLLECTED LATER','+$60','Today','Over time','local discount card']) assert.ok(!section.textContent.includes(obsolete));
  const stages=[...section.querySelectorAll('.energy-fiscal__stages li')].map(e=>e.textContent);
  assert.deepEqual(stages,['Refinery','Regional fuel system','Local station','Producer value','Taxes + royalties','State budget / funds']);
  assert.match(section.textContent,/One price, two local effects/);
  assert.match(section.querySelector("#fiscal-revenue-heading").textContent,/What producing states collect/);
  assert.ok(section.querySelector(".energy-fiscal__route--revenue .energy-fiscal__nm-case"));
  assert.match(section.textContent,/full-year average oil price vs. August forecast/);
  assert.match(section.textContent,/not cash already collected, a household rebate/);
  const high=roundedFiscalMagnitude(fiscalSensitivity(10,snapshot.fiscal.annualMillionsPerDollar));
  assert.ok(section.querySelector('.energy-fiscal__sensitivity').textContent.includes(`About +$${high}m`));
  assert.match(section.querySelector('.energy-fiscal__takeaway strong').textContent,/net economic gain/);
  assert.equal(section.querySelectorAll('tbody tr').length,3);
  assert.match(section.querySelector('tbody').textContent,/At forecast/);
  assert.ok(section.querySelector('#two-ledgers'), 'legacy incoming anchor remains available');
});

test('fiscal reveal is one-time, motion-optional and safe on restored or delayed pages', (t) => {
  for(const mode of ['reveal','reduced','visible','restored','failure']) {
    const {win,doc}=fixture(t);const root=doc.querySelector('[data-energy-fiscal]');
    assert.equal(root.dataset.fiscalState,undefined);
    root.querySelector('[data-fiscal-flow]').getBoundingClientRect=()=>({top:mode==='visible'?200:1400});
    const media=new win.EventTarget();media.matches=mode==='reduced';win.matchMedia=()=>media;
    let callback,complete;
    win.IntersectionObserver=class {constructor(cb){callback=cb;} observe(){if(mode==='failure')throw Error('observer unavailable');}disconnect(){}};
    win.setTimeout=(cb)=>{complete=cb;return 1;};win.clearTimeout=()=>{};
    const cleanup=enhanceFiscal(root);
    if(mode==='reveal') {
      assert.equal(root.dataset.fiscalState,'pending');
      win.dispatchEvent(new win.Event('pageshow'));
      assert.equal(root.dataset.fiscalState,'pending', 'initial pageshow must not cancel entry reveal');
      callback([{isIntersecting:true,intersectionRatio:.2}]);
      assert.equal(root.dataset.fiscalState,'revealing');complete();
      callback([{isIntersecting:true,intersectionRatio:.2}]);
    }
    if(mode==='restored') {const e=new win.Event('pageshow');e.persisted=true;win.dispatchEvent(e);}
    assert.equal(root.dataset.fiscalState,'complete');cleanup();
  }
});

test('Outlook starts with dated conditions and retains all cases without JavaScript', (t) => {
  const {doc}=fixture(t);const root=doc.querySelector('[data-energy-outlook]');
  assert.equal(root.dataset.outlookState,'today');
  assert.equal(root.querySelector('[data-outlook-controls]').hidden,true);
  assert.equal(root.querySelectorAll('input[type="radio"]:checked').length,1);
  assert.equal(root.querySelector('input[type="radio"]:checked').dataset.outlookSelect,'today');
  assert.equal(root.querySelectorAll('tbody tr').length,6);
  assert.equal(root.querySelectorAll('thead th').length,4);
  assert.equal(root.querySelector('time').getAttribute('datetime'),'2026-09-25');
  assert.ok([...root.querySelectorAll('svg')].every(svg=>svg.getAttribute('aria-hidden')==='true'));
  assert.ok([...root.querySelectorAll('[data-outlook-copy]:not([aria-hidden])')].every(el=>el.dataset.outlookCopy==='today'));
  assert.equal(root.querySelector('[data-action]'),null);
  assert.equal(root.querySelector('[data-outlook-case]'),null);
  assert.doesNotMatch(root.textContent,/Explore this path|For now:|CONDITIONAL PATH|HIGHER RISK/);
  assert.match(root.textContent,/not quantities/);
  assert.match(outlookToday.routes.detail,/restarted September 22 below full capacity/);
  assert.match(outlookToday.refining.detail,/94\.0%.*week ending September 18/);
  assert.doesNotMatch(root.textContent,/Sep\. 22|September 22 baseline|96\.8/);
});

test('Outlook changes physical geometry and five explanations atomically during rapid switches', (t) => {
  const {win,doc}=fixture(t);const root=doc.querySelector('[data-energy-outlook]');
  const cleanup=enhanceOutlook(root);
  assert.equal(root.querySelector('[data-outlook-controls]').hidden,false);
  for(const id of ['recovery','constraint','disruption','today','disruption','recovery','today']) {
    root.querySelector(`[data-outlook-select="${id}"]`).click();
    const state=outlookStates.find(s=>s.id===id);
    assert.equal(root.dataset.outlookState,id);
    assert.equal(root.querySelector('[data-outlook-mode]').textContent, id === 'today' ? 'Current conditions' : `Conditional case: ${state.title}`);
    assert.equal(root.querySelector('[data-outlook-vintage]').hidden, id !== 'today');
    assert.equal(root.querySelectorAll('input[type="radio"]:checked').length,1);
    assert.equal(root.querySelector('input[type="radio"]:checked').dataset.outlookSelect,id);
    for(const [key,value] of Object.entries(outlookGeometry(state))) assert.equal(root.style.getPropertyValue(key),value);
    const visible=[...root.querySelectorAll('[data-outlook-copy]:not([aria-hidden])')];
    assert.equal(visible.length,7);
    assert.ok(visible.every(el=>el.dataset.outlookCopy===id));
    for(const key of ['routes','inventories','refining','gasoline','diesel']) assert.ok(visible.some(el=>el.textContent.includes(state[key].detail)));
    assert.match(root.querySelector('[data-outlook-status]').textContent,/Gasoline:.*Diesel:/);
  }
  const g=outlookCases.map(s=>s.geometry);
  assert.ok(g[0].routeWidth>outlookToday.geometry.routeWidth && g[2].routeWidth<outlookToday.geometry.routeWidth);
  assert.ok(g[0].stock>outlookToday.geometry.stock && g[2].stock<outlookToday.geometry.stock);
  assert.ok(g[0].dieselChannel<g[0].channel);
  assert.ok(g[0].gasolineAngle>g[0].dieselAngle, 'gasoline eases further than diesel in recovery');
  assert.ok(g[2].dieselAngle<g[2].gasolineAngle, 'diesel can tighten faster in disruption');
  cleanup();
  assert.equal(root.dataset.outlookState,'today');
  assert.equal(root.querySelector('[data-outlook-controls]').hidden,true);
  root.querySelector('[data-outlook-select="recovery"]').click();
  assert.equal(root.dataset.outlookState,'today','cleanup removes old listeners');
  assert.equal(win.localStorage.length,0);
});

test('Outlook reduced-motion styles remove transitions while controls retain every explanation', async (t) => {
  const {win,doc}=fixture(t);
  win.happyDOM.settings.device.prefersReducedMotion='reduce';
  const style=doc.createElement('style');
  style.textContent=await readFile('src/styles/energy-outlook.css','utf8');doc.head.append(style);
  assert.equal(win.matchMedia('(prefers-reduced-motion: reduce)').matches,true);
  const root=doc.querySelector('[data-energy-outlook]');const cleanup=enhanceOutlook(root);
  for(const id of ['recovery','constraint','disruption','today']) {
    root.querySelector(`[data-outlook-select="${id}"]`).click();
    assert.equal(root.dataset.outlookState,id);
    for(const el of root.querySelectorAll('.outlook-route,.outlook-stock,.outlook-channel,.outlook-pressure')) assert.equal(win.getComputedStyle(el).transition,'none');
    assert.equal(root.querySelectorAll('[data-outlook-copy]:not([aria-hidden])').length,7);
  }
  cleanup();
});


test("state joins and distribution survive independently reordered source rows", () => {
  const shuffled=structuredClone(snapshot);
  shuffled.metrics[1].rows.reverse();
  shuffled.metrics[2].rows.sort((a,b)=>a.value-b.value);
  assert.doesNotThrow(()=>assertSnapshot(shuffled));
  assert.deepEqual(statePriceRows(shuffled.metrics),statePriceRows(snapshot.metrics));
  for(const id of ['gasoline','diesel']) {
    const d=fuelDistribution(shuffled.metrics,id,'NM');
    assert.equal(d.dots.length,13);
    assert.equal(new Set(d.dots.map(r=>r.code)).size,13);
    assert.ok(d.dots.every(r=>r.x>=0&&r.x<=100&&r.lane*14<76));
    for(const a of d.dots) for(const b of d.dots) if(a.code!==b.code&&a.lane===b.lane) assert.ok(Math.abs(a.x-b.x)>=4.5);
  }
});

test("final act descends from state and gallons to regional depth and quiet prose", (t) => {
  const { doc }=fixture(t);
  const personal=doc.querySelector('[data-energy-personal]');
  assert.ok(personal.querySelector('#compare-states'));
  assert.ok(personal.querySelector('#fuel-budget'));
  assert.equal(doc.querySelector('.energy-actions,.energy-resolution,.energy-toolbox'),null);
  assert.equal(doc.querySelector('#energy-epilogue').querySelector('button,input,h2'),null);
  assert.ok(doc.querySelector('[data-regional-prices]').closest('details'));
  assert.match(personal.textContent,/not a forecast/);
  assert.match(personal.textContent,/If the same difference held for two months/);
});

test("personal marker motion is removed for reduced-motion readers", async (t) => {
  const {win,doc}=fixture(t);
  win.happyDOM.settings.device.prefersReducedMotion='reduce';
  const style=doc.createElement('style');style.textContent=await readFile('src/styles/energy-personal.css','utf8');doc.head.append(style);
  assert.equal(win.getComputedStyle(doc.querySelector('[data-selected-marker]')).transition,'none');
  initializeEnergy(doc);
  doc.querySelector('[data-state-select]').value='CA';doc.querySelector('[data-state-select]').dispatchEvent(new win.Event('change',{bubbles:true}));
  assert.equal(doc.querySelector('[data-selected-value]').textContent,'$6.14');
});
