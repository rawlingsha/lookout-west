# The West’s Energy Bill

Published-listing status was explicitly requested by Henry. The local content entry has `draft: false`; this work does not deploy the site.

## Reproduce

From the repository root:

```sh
Rscript analysis/quarterly/west-energy-bill/R/validate.R
npm run check
npm run test:energy
node --experimental-strip-types --test tests/sharing.test.mjs
```

`npm run dev` and `npm run build` first validate the frozen inputs and regenerate five annotated chart PNGs/SVGs, the article card, and CSV/JSON downloads. The existing sharing pipeline then generates article and chart preview, portrait, story, and downloadable PNG files. No external request runs in the reader’s browser or during a normal build.

## Data and editorial provenance

- `input/` retains the user-supplied essay and research notes, a manually transcribed 13-state table, and the original New Mexico forecast PDF.
- `src/data/interactive/west-energy-bill/snapshot.json` is the versioned data authority. `sources.json` records units, periods, release dates, retrieval times, definitions, transformations and archive SHA-256 hashes.
- AAA’s September 19, 2026 prices, EIA’s June 2026 residential column, BLS’s August annual changes, and EIA’s September 11 single-week refinery/inventory measures were independently checked against their official pages. The New Mexico coefficient was read from PDF page 16 ($56.45m) and its FY2027 scope and transfer rules checked on page 41. The forecast document dates its narrative August 26, despite the August 25 meeting filename.
- The supplied essay remains the prose authority. Its opening CPI paragraph moves alongside the opening graphic; the four-stage supply explanation carries the slow-adjustment and refinery-utilization passages. Inline sources and qualifications are retained. The outlook cards describe conditional cases without invented probabilities or price bands.
- The supplied research notes retain the wider claim/source ledger. The new data modules freeze the interactive inputs; this is not a live data feed. Refresh prose, data, source metadata and exports together before reusing the dated outlook.

## Integration

The existing research content route renders MDX inside `ArticleLayout`. Optional `format: interactive` widens this article while leaving ordinary essays at their existing width. There is one masthead, main landmark, article heading, canonical route and metadata source. Existing sharing controls, subscription UI, RSS, sitemap and topic listings are reused. Five charts have their own share pages and article return anchors; deep links reveal the relevant price metric.

The deployment configuration is static Astro output with Cloudflare Pages `_headers`. The policy is unchanged. Emitted production scripts are external same-origin modules; no inline executable script, framework, new dependency, tracking, storage, API key or remote embed was introduced.

## Verification, September 19, 2026

- Baseline: `astro check` had zero diagnostics; build passed. The sharing suite initially had one failing test because the cattle article no longer contained `figure-processing-and-feedlots`. On the continuation pass, the existing chart was marked standalone: its share page and downloads remain available, and it now returns to the article without a missing fragment. Cattle article prose and figure placement are unchanged.
- Final checks: `astro check` has zero diagnostics, the production build passes, and all 28 tests pass (17 energy, 11 sharing). Energy checks cover invalid data, all three measures, all 39 prices against the archived table, independent calculator fixtures, negative/zero/boundary inputs, invalid/restored forms, separate state domains, anchor navigation, fast/reverse step resolution, reduced-motion teardown, static fallbacks, public listings, metadata, downloads and external scripts. All 58 local targets referenced by the energy article and standalone cattle chart were also checked for existence.
- A failing scroll observer now restores ordinary reading flow even if setup has already applied the sticky layout. Short available viewport height also retains the static explanation. Print events open data and source disclosures and restore the reader’s disclosure choices afterward; print CSS includes the final supply diagram and all three state comparisons. DOM tests cover these changes, while actual printed pagination still needs browser review.
- Independent base-R checks pass. The annual fiscal examples are ±$564.5m before symmetric rounding to about ±$565m. Currency arithmetic uses integer cents.
- New compressed story JavaScript is under 3 KB; story CSS approximately 2.8 KB; data approximately 1.3 KB. Budgets are enforced by the energy test. Existing shared asset sizes did not increase. These are transfer-size checks, not field Core Web Vitals measurements.
- The card and annotated gasoline/fiscal exports were visually inspected. The connected-browser list was empty on both attempts. Real desktop/mobile screenshots, 320px reflow, keyboard/screen-reader checks, printed pagination and browser-enforced production CSP therefore remain unverified. DOM tests and CSS inspection do not substitute for those checks. A browser connection was requested during the continuation pass.
- No representative-reader interviews, deployment, commit or push was performed.

## Review locally

Open `/research/west-energy-bill/` in the existing dev server. Review all three price measures, an 80-gallon / $0.50 example ($40 monthly, $80 over two months), a negative price change, empty inputs, chart share return links, mobile layout and reduced motion. Check production response headers on the normal preview host before deployment; Astro’s dev server does not apply Cloudflare `_headers`.

The reusable pieces live in `src/components/interactive/energy/` and `src/lib/interactive/energy/`. Change article prose in `src/content/articles/west-energy-bill.mdx`; change data in the snapshot and manifest rather than editing generated images.
