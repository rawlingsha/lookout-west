# Publishing The Current

Add one JSON file per edition in `src/content/current/`, conventionally `YYYY-MM-DD.json`. The `date` field determines its permanent `/current/YYYY-MM-DD/` URL. Duplicate dates fail the build. Set `draft: true` while writing; drafts are available at their dated URL in `npm run dev`, with noindex, and also populate the local homepage and Current landing page for review. They are excluded from all production surfaces and the published archive. Set `draft: false` only when editorially ready. As with Research, publication happens on the next site build (dates do not schedule publication).

Each edition needs `date`, `draft`, and 5–7 ordered `signals`. Array order determines numbering. Optional `deck` supplies the concise homepage preview and metadata; keep it to one or two sentences. Without it the homepage uses the first paragraph of the lead signal. Optional `readTime` is a positive number of minutes; otherwise calculated at 220 words/minute.

Each signal needs:

- `id`: unique, stable lowercase hyphenated fragment, retained when editing a headline.
- `topic`: an existing topic slug (`energy`, `growth`, `housing`, `labor`, `land`, `water`).
- `headline` and `body`: plain text; separate body paragraphs with `\n\n`.
- `source`: `label`, optionally an HTTP(S) `url` and `date` in YYYY-MM-DD format.

For a signal citing multiple releases, optional `additionalSources` accepts more objects with the same `label`, `url`, and `date` fields; they share the existing source treatment.

Optional signal fields: `geography`, `relatedResearch` (a `/research/slug/` path), and `visual` (`src` under public, meaningful `alt`, intrinsic `width`/`height`, and `caption`). Export charts, maps or tables as accessible evidence images; do not place essential information only in the image. The existing FigureBlock handles captions. No visual is required.

Published editions automatically populate the homepage preview, `/current/`, the chronological past-editions list, permanent dated pages, and sitemap. Latest appears in full only on Current surfaces. Empty production shows an honest forthcoming state.

## Development and verification

`/current/preview/` exists only in the development server. It uses `tests/fixtures/current.json`, visibly labeled as layout testing throughout, to exercise seven signals, long copy and metadata, existing artwork and Research links. That fixture is outside the content collection and never receives a production route. Do not copy fixture prose into published content.

Run `npm run check`, `npm run build`, then `node --experimental-strip-types --test tests/current.test.mjs`. Also run the existing sharing and energy tests and lint. Review the fixture at desktop, mobile and narrow/zoomed widths, and compare the homepage and Research. No new client-side scripts or dependencies are required.

## October 2 edition

`src/content/current/2026-10-02.json` is marked `draft: false` and will publish with the next deployment. It populates `/`, `/current/`, and `/current/2026-10-02/` in production and is included in the sitemap. No past editions were added.

The edition is text-led, with a calculated four-minute reading time. Energy leads and links to existing Research; agriculture uses Land and industrial investment uses Growth, preserving the existing topic vocabulary. The seven-signal synthetic fixture remains separately available at `/current/preview/` for stress testing.
