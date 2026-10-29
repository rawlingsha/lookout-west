# Sharing implementation and editorial workflow

Updated October 29, 2026. This implementation builds on the existing sharing system.

## Architecture and original behavior

- Astro 6.1.9, static output, MDX content collections, npm/package-lock, Node >=22.12.0. `npm run build` runs the existing energy asset generator and Sharp social generator before Astro writes `dist/`. Hosting uses Cloudflare Pages and `public/_headers`; the live edition returned HTTP 200 with Cloudflare and the expected security headers. The existing GitHub integration deploys pushes to `main` and reports a Cloudflare Pages check; no separate deployment workflow is committed.
- Articles live in `src/content/articles/*.{md,mdx}`. Current editions live in `src/content/current/YYYY-MM-DD.json`, validated by `src/lib/current-schema.ts` and sorted by date in `src/lib/current.ts`.
- `ShareActions.astro`, `SharePanel.astro`, `share-actions.ts`, and `sharing.css` already served articles, Current editions, and registered charts. The original disclosure repeated the title, listed platforms, offered a second native-share action, and contained Instagram and Substack helpers plus a URL field. X automatically included the full headline. Current already used edition permalinks but inherited generic site artwork.
- `BaseLayout.astro` remains the single server-rendered metadata owner. Nested layouts pass metadata to it; no tags are inserted by client JavaScript. Default indexing remains enabled and now permits large search image previews; chart utility pages retain their existing indexing policy.
- Sharp + YAML already generated 1200×630 previews, 1080×1350 Post images, 1080×1920 Stories, and chart PNGs. The earlier landscape article template combined the full headline and a small image. The generator continues to use the existing Georgia/Arial system font choices, with no font downloads or added packages. Publication colors now come from `src/styles/tokens.css`.
- Existing Node test runner + happy-dom tests cover production HTML and local interactions. There was no browser E2E runner. ESLint was installed but had no configuration; a flat configuration now enables the existing Astro plugin and correctness rules. Three pre-existing unbalanced tags in About, Contact, and Services were repaired so lint can run.
- No analytics provider or event receiver exists. No provider or analytics traffic was added.

The requested live research URLs and `/current/` were inspected; `/current/2026-10-23/` was also fetched directly after the web reader failed. All five paths remain current.

## Reader behavior

Research has Share and Copy link at both ends. Current uses **Share this edition** and Copy link at both ends, including on the latest-edition page. Each action uses the permanent dated URL. The landing page's own canonical, title, description, and publication card remain evergreen.

Share invokes `navigator.share()` directly during the click, without an intervening fetch or await. Only explicitly authored `shareText` becomes additional post text. Cancellation stays quiet; unsupported payloads and failures reveal working alternatives. Browser capabilities, rather than device detection, control this behavior.

The fallback panel lists Copy link, X, LinkedIn, Facebook, Email, Instagram images, and Substack Notes. Native-share browsers expose a secondary **More sharing options** button so these capabilities stay reachable. X uses just the URL by default. LinkedIn and Facebook get the URL and retrieve metadata themselves. Email has an encoded subject and link. External platform links retain `noopener noreferrer`.

Clipboard success is announced only after `writeText` resolves. Denied or absent clipboard access reveals, focuses, and selects a labeled URL field. Server-rendered disclosures, links, downloads, and selectable URLs remain usable without JavaScript. Dialogs support Escape, outside-click dismissal, focus restoration, visible focus, and mobile modal focus containment. There are no animations. Astro page-load/before-swap handlers reinitialize and clean up listeners and dialogs if client navigation is introduced.

Instagram offers Share Story image when file sharing is supported, Download Story image, Download Post image, and Copy link. Files are prepared only after the reader expands Instagram; the final native share call happens synchronously from a separate click. No export images preload with the page. Instructions cover Safari image saving and manually adding an Instagram Story link sticker. Neither Instagram nor Notes claims automatic publication.

## New research articles

Edit frontmatter in `src/content/articles/<slug>.md` or `.mdx`. The filename remains the URL slug. Preserve published wording and image rights/credits in the article.

| Field | Purpose |
| --- | --- |
| `title` | Published headline; default OG, Twitter, and native-share title |
| `deck` | Published summary and fallback description |
| `seoDescription` | Existing concise description override, reused by page/OG/Twitter metadata |
| `seoTitle` | Existing browser/search page title override; does not replace the editorial share headline |
| `publishDate`, `updatedDate` | Actual publication/modification dates; optional modification date is never fabricated |
| `cardImage`, `cardImageAlt` | Existing article artwork and its description; default social photo source |
| `socialTitle` | Optional deliberate share-headline override; does not change the article headline |
| `socialImageSource` | Optional local photo used only in generated landscape previews. `null` selects typography instead of using `cardImage` (for example, when the card is a dense chart) |
| `socialCardTitle` | Optional short editorial subject for the typography card; defaults to the article's topic |
| `socialImage` | Optional completed 1200×630 editorial image, replacing the generated landscape card |
| `socialImageAlt` | Description of the final social image; set this when choosing a different image or designed override |
| `shareText` | Optional independently authored substantive message. Omit for URL-only X posts and title+URL native sharing |
| `instagramPostImage` | Optional completed 1080×1350 Post image |
| `instagramStoryImage` | Optional completed 1080×1920 Story image |

All asset overrides use local paths beginning with `/`, backed by files in `public/`. JPEG, PNG, and WebP are accepted. The generator rejects missing files, paths escaping `public/`, unsupported formats, and wrong export dimensions. Prefer JPEG for broadly compatible social artwork. There is no redundant `socialDescription`: the existing `seoDescription`/`deck` fields serve that purpose.

The photo template fills the landscape image area with a centered crop and a restrained Lookout West identity strip. Review portrait sources carefully; use `socialImageSource` or a completed `socialImage` if the centered crop loses an important subject. The existing on-site `cardImagePosition`/`cardImageWidePosition` still control only website card framing. A typography fallback uses a short editorial subject instead of squeezing in a long headline. Charts are never selected automatically as replacement photographs.

Generated metadata points to content-hashed images in `public/social/generated/versioned/`. The generated `src/data/social-images.json` manifest supplies the final image URL, dimensions, alt text, and Instagram paths. Both locations are ignored build products. Do not edit them manually. Existing unversioned export URLs remain available. Custom social/Instagram overrides are copied to versioned assets without changing the originals. Chart previews also receive content hashes.

Run `npm run build` for production or `npm run dev` for local development; both generate assets first. `npm run check` also prepares its manifest. If editing content while a dev server is already running, run `npm run images:share` to refresh previews. Use **npm run build**, not bare `astro build`, in hosting settings. The build includes the images in `dist/` and performs no runtime image generation.

## New Current editions

Add the normal edition JSON with its real `date`, `deck`, and five to ten signals. Set `draft: false` when publishing. The latest published date automatically drives `/current/` and both sharing controls; no component edits are required.

Every dated edition gets its own date-specific 1200×630 olive/cream card, OG title, description, publication date, canonical URL, and Instagram exports. The JSON accepts `socialTitle`, `socialImage`, `socialImageAlt`, `shareText`, `instagramPostImage`, `instagramStoryImage`, and optional `updatedDate`. Use the existing `deck` for its description. Older issues never read the latest issue's metadata. `/current/` has a separate undated publication card.

## Charts

Keep stable `figure-<id>` anchors and `src/data/share-figures.json` registrations. Render registered figures with `ShareableFigure` (or the existing energy figure component), not a plain `FigureBlock`, when sharing controls are required. Controls now say Share this chart, Download chart, and Copy chart link.

The twelve image charts keep their existing `/visualizations/<article>/<figure>/` routes, independent metadata, source details, original PNG downloads, and portrait/Story exports. Those utility routes retain their existing `noindex,follow` policy and sitemap exclusion. Their return links point to real article anchors unless `standalone: true` preserves a removed chart's old URL. The semantic data-centers table keeps its article fragment and has no invented raster export. A fragment does **not** create a separate social card.

## Verification and release

See [the review gallery and results](sharing-review/README.md) for screenshots, full-size artwork, reduced previews, and exact test scope.

Run:

```sh
npm run check
npm run lint
npm run test:sharing
# Once production output exists, the other directly relevant suites:
node --experimental-strip-types --test tests/current.test.mjs tests/subscribe.test.mjs tests/ballot-navigation.test.mjs
# Full suite, including the repaired energy interactions:
npm test
# Regenerate artwork review files (not deployed):
npm run images:share -- --review
```

After deployment, inspect the public HTML source and fetch each `og:image` URL. It must return HTTP 200, an image MIME type, and actual image bytes without authentication or a crawler challenge. Local HTTP verification passed, but hosting/WAF behavior for the newly deployed assets remains a release check.

1. In [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/), inspect the three research URLs and at least two dated Current URLs. Confirm the canonical, headline, image, and dates; re-inspect after deployment to request a fresh fetch.
2. In [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/), enter each deployed URL and use **Scrape Again** when available. Check the fetched OG fields and image. The debugger itself was rate-limited during this session; no deployed Meta preview was verified.
3. Paste a deployed URL into [X's post composer](https://x.com/compose/post), wait for its card, and inspect it without publishing. The URL-only intent must not inject a second copy of the headline. Existing posts and platform caches can keep an older card even after new metadata is deployed.
4. Paste the same links into a draft iMessage or WhatsApp message. Check the preview, then test actual Share/Copy and Story file sharing on iOS Safari and Android Chrome. Add the Instagram image and link sticker manually when desired.

Content hashes change the image URL when its bytes change; they cannot force a platform to refetch an already cached page or change its thumbnail presentation. Refresh through supported inspector tools and allow caches to expire. These external previews and native mobile share sheets are not claimed as verified.
