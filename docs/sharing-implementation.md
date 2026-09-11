# Sharing implementation

Implemented September 8, 2026, following [the design plan](sharing-design-plan-2026-09-08.md).

## Available now

- Every published article has **Share** and **Copy link** below its metadata and after its body. Draft previews hide these controls.
- The destination panel includes LinkedIn, X, Facebook, email, native device sharing when supported, and guided Instagram/Substack Notes flows.
- Copy success is announced. Clipboard denial reveals a selectable URL. Cancellation of native sharing is quiet; other failures leave working alternatives.
- Desktop uses an anchored, nonmodal dialog. Narrow screens use a native modal dialog styled as a bottom sheet. Server-rendered disclosure panels, destination links, and URLs work without JavaScript.
- Each article has a generated landscape preview, portrait post image, and Story image. The two empty default images have been replaced. Article metadata now uses its own image, full sharing headline, description, publication dates, and image alt text/dimensions.
- The Growth heatmap, Taxes chart, and all five cattle charts have contextual controls, PNG downloads, portrait/Story exports, and dedicated pages with independent Open Graph metadata. Chart links lead to these pages; the pages link back to the exact article anchor. Selecting a chart image opens its full-size original.
- The Data Centers table has a stable anchor and sharing controls; it remains a semantic HTML table and does not offer a raster download.
- Existing article images now declare dimensions to reduce layout shifts when navigating to a figure.

Pilot routes:

- `/visualizations/west-growth-drivers/growth-drivers/`
- `/visualizations/taxes-in-the-west/tax-bases/`
- `/research/data-centers/#figure-local-capacity-ledger`

The first two are fetchable utility pages with `noindex,follow` and are omitted from the sitemap. They use their own canonical and Open Graph URLs rather than redirecting to the parent article.

## Authoring

`npm run dev` and `npm run build` automatically generate share images first. Generated images live in ignored `public/social/generated/`; they are included in the built `dist/` output. Use the npm build command in deployment settings. If a title or image changes during an already-running dev session, run `npm run images:share` to refresh its exports.

Article artwork comes from `cardImage`, with a typography-only template when that field is absent. PNG/JPEG exports preserve the full source image. Optional `socialImage` and `socialImageAlt` frontmatter override the link preview; the custom image must be a valid local asset under `public/`. The portrait/Story downloads still use the article card artwork.

For card framing, optional `cardImagePosition` sets the CSS `object-position`
(for example, `"50% 55%"`). `cardImageWidePosition` overrides it for the wide
desktop homepage card. Other articles retain centered framing. These settings
crop the displayed card only; the saved image and full-image social exports
are preserved.

To add a shareable figure, add an entry to `src/data/share-figures.json` and replace its raw MDX figure with:

```mdx
import ShareableFigure from "../../components/article/ShareableFigure.astro";

<ShareableFigure id="permanent-figure-id" />
```

Use this component for charts that should have sharing controls. `FigureBlock`
only formats an image and caption; publishing an article does not add controls
to it. Once registered and rendered with `ShareableFigure`, the chart uses the
same controls as the other charts and receives exports on the next npm build
or dev startup. During an existing dev session, run `npm run images:share`.

Each entry needs `id`, `article` (the content filename without extension), `kind`, `title`, `caption`, and `source`. Image figures also need a local `image` and meaningful `alt` description. Preserve existing IDs when editing titles or moving figures. Tables omit `image` and provide their existing table markup inside the component's slot.

The generator validates unique IDs, local asset paths, and published parent articles. Artwork and sources should be checked before enabling an image export. Dense graphics may need editorial recomposition for small screens; the generator preserves the full original chart rather than inventing or cropping data.

Future tool pages can use the URL helper's explicit parameter option to preserve selected states, metric, and period. No explorer or state model has been invented for the existing empty tool placeholders. Additional chart migration, quote cards, and analytics remain optional extensions.

## Verification

- `npm run check` checks Astro/TypeScript.
- `npm run test:sharing` builds the site and runs the sharing tests. Tests inspect actual generated HTML and image assets, then exercise the local interactions in a simulated DOM. They do not emulate real operating-system share sheets or platform accounts.
- The baseline checker issues were corrected by excluding public static assets (including a saved webpage) from TypeScript input and typing the two research-card helper parameters.

Representative article previews and chart exports were inspected as images. A browser connection was unavailable, so final visual checks at mobile/desktop widths, real iOS/Android share-sheet behavior, logged-in X/LinkedIn/Facebook composer handoffs, and live platform preview debuggers remain release checks. The site has not been deployed by this work.

Instagram receives an image through download or optional native file sharing; readers add the image and link themselves. Substack uses copy-and-paste into Notes. Neither flow claims to publish a post automatically.
