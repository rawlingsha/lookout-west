# Lookout West Sharing Experience

## UX and product brief for article, chart, and quote sharing

**Prepared:** August 9, 2026  
**Audience:** UX/product designer, visual designer, and implementation partner  
**Status:** Design brief based on the current repository and published-content architecture

---

## 1. Executive summary

Lookout West is a lightweight, statically generated editorial website built with Astro and MDX. The sharing experience should preserve that character: fast, restrained, accessible, and useful without introducing a large client-side application or third-party widget.

The recommended path is progressive:

1. **Phase 1 — Share an article:** add a compact sharing group near article metadata and a quieter repeat action at the end of the article. Provide native device sharing when supported, plus dependable copy-link and email actions. Do not begin with a long row of social-network logos.
2. **Phase 2 — Share a specific chart or quote:** give selected figures and pull quotes stable anchors, a small contextual share action, and copy that links directly to that element in the article.
3. **Phase 3 — Share a designed chart or quote card:** create structured shareable-content objects and pre-generated image assets or dedicated share pages. This is necessary if shared links must preview the selected chart or quote rather than the article’s default social image.

The highest-value design decision is to treat sharing as one small system with three content scopes—article, figure, and quote—rather than as unrelated buttons added in several places.

### Recommended Phase 1 outcome

A reader sees a labeled **Share** control immediately after the byline/date row. On browsers with native sharing, activating it opens the operating system’s share sheet. A nearby **Copy link** action is always available. On desktop, the Share control can open a small menu containing Copy link and Email; network-specific destinations may be added only if product data later supports them.

### Important current constraints

- Article pages share a generic Open Graph image today, even when an article has its own card image.
- Article front matter contains SEO titles and descriptions, but the article route does not currently pass those values to the page layout.
- Figures are authored as raw MDX markup and generally lack captions, IDs, share labels, and structured source fields.
- There are currently no pull quotes or quote components used in the six article files.
- No analytics provider or event-tracking layer is present in the repository.
- The site’s Content Security Policy allows only same-origin scripts. A third-party share widget would require security-policy changes and is not recommended.

---

## 2. Product goals and non-goals

### Goals

- Make sharing a full article obvious without competing with the reading experience.
- Make copying a canonical link reliable on desktop and mobile.
- Use native operating-system sharing where it improves the experience.
- Preserve a functional fallback when JavaScript or a browser API is unavailable.
- Establish a visual and content model that can later support sharing individual figures and quotes.
- Ensure shared URLs have deliberate titles, descriptions, images, and attribution.
- Give the product team a measurable funnel from share intent to completed local actions such as copying a link.
- Meet WCAG 2.2 AA interaction requirements and fit the site’s existing keyboard and reduced-motion behavior.

### Non-goals for Phase 1

- Generating custom quote cards in the browser.
- Capturing arbitrary DOM elements as images.
- Building a user account, saved-items system, or social feed.
- Showing share counts; these are unreliable, visually noisy, and can create negative social proof.
- Loading a third-party sharing SDK.
- Promising that a click on a network link resulted in a published post. The site can measure intent, not completion on an external service.

---

## 3. Current website architecture

### 3.1 Technology stack

| Area | Current implementation | Design implication |
|---|---|---|
| Framework | Astro 6.1 | Pages are rendered to static HTML; interactive sharing should be a small enhancement. |
| Content | Astro content collections with Markdown/MDX | Article and source metadata are validated centrally. Figure/quote share metadata can be added to this authoring model. |
| Language | TypeScript in Astro front matter; plain browser JavaScript for interactions | A sharing module can follow the existing no-framework JavaScript pattern. |
| Styling | Plain CSS with global custom-property tokens and component-scoped styles | Share components should use the existing tokens and BEM-like naming. |
| Build | Static Astro build | Article and content-share routes can be generated at build time; dynamic server image generation is not currently available. |
| Hosting signals | `_headers` uses Cloudflare Pages-style rules | Security and preview behavior should be tested on the production hostname and Pages previews. |
| Dependencies | Astro, MDX, RSS, sitemap, Sharp | No client UI library, icon package, analytics package, or image-capture package exists. |

Relevant files:

- `package.json`
- `astro.config.mjs`
- `src/content.config.ts`
- `src/pages/research/[slug].astro`
- `src/layouts/ArticleLayout.astro`
- `src/layouts/BaseLayout.astro`
- `src/styles/tokens.css`
- `src/styles/prose.css`
- `public/_headers`

### 3.2 Article rendering flow

The current article pipeline is:

```text
src/content/articles/*.mdx
        ↓
Astro “articles” content collection and schema
        ↓
src/pages/research/[slug].astro
        ↓
src/layouts/ArticleLayout.astro
        ↓
src/layouts/BaseLayout.astro
        ↓
Static /research/{article-id}/ page
```

This is favorable for Phase 1. One addition to the shared article route/layout can cover every published article without modifying each MDX file.

### 3.3 Current article inventory

There are six article files and 19 authored figures:

| Article | Figures | Current structured quotes |
|---|---:|---:|
| `cost-of-the-west.mdx` | 3 | 0 |
| `data-centers.mdx` | 3, including one table figure | 0 |
| `land-man.mdx` | 4 | 0 |
| `taxes-in-the-west.mdx` | 1 | 0 |
| `west-growth-drivers.mdx` | 3 | 0 |
| `western-water-wars.mdx` | 5 | 0 |

Most figures are raw `<figure>` and `<img>` markup. A reusable `FigureBlock.astro` component exists, as does `PullQuote.astro`, but published MDX does not currently use either component. Several other article component files are empty placeholders: `ArticleHeader.astro`, `ArticleMeta.astro`, `ArticleAside.astro`, and `SourcesBlock.astro`.

This suggests a safe implementation sequence:

- Put article-level sharing in `ArticleLayout.astro` first.
- Extend and adopt `FigureBlock.astro` and `PullQuote.astro` before attempting element-level sharing.
- Avoid adding share markup manually to 19 figures because it would create inconsistent content and future maintenance work.

### 3.4 Current metadata and URL behavior

- Production origin: `https://lookoutwest.us`
- Article URLs: `/research/{content-entry-id}/`
- Canonical URLs are created in `BaseLayout.astro` from the current path and production origin.
- Default social image: `/social/og-default.jpg`
- Base Open Graph type is currently `website`, including on articles.
- Twitter/X card type is `summary_large_image`.
- The article schema supports `seoTitle`, `seoDescription`, `cardImage`, and `cardImageAlt`.
- The article route currently passes the visible title and deck to the layout, not `seoTitle`, `seoDescription`, or `cardImage`.
- No article-specific Open Graph image, `article:published_time`, `article:modified_time`, or structured Article data is currently emitted.

Before a public sharing launch, article metadata should be corrected so a shared link reliably displays the intended article title, description, and image.

### 3.5 Current interaction architecture

The mobile menu and subscription dialog use:

- server-rendered HTML;
- `data-*` hooks;
- external same-origin scripts in `public/scripts/`;
- feature initialization guards;
- explicit keyboard behavior;
- focus return and focus containment for the modal;
- a global `has-overlay-open` state; and
- no client framework or hydration runtime.

Sharing should use the same pattern. A likely structure is:

```text
src/components/article/ShareActions.astro
public/scripts/share-actions.js
component-scoped CSS or a small article-sharing stylesheet
```

If a share menu is designed as a nonmodal popover, it should follow the mobile-menu behavior: open on click, close on outside click, close on Escape, and return or preserve focus predictably. If a mobile bottom sheet is chosen, it should follow the subscription modal’s dialog/focus behavior.

### 3.6 Security constraints

The current Content Security Policy includes `script-src 'self'` and `connect-src 'self'`. This supports a local sharing script and discourages third-party widgets.

The site is already HTTPS in production, which is required for the Web Share and Clipboard APIs. If native file sharing is added later, update the Permissions Policy deliberately to include `web-share=(self)` rather than relying on browser defaults.

---

## 4. Current visual language

### 4.1 Brand character

The visual system is editorial and restrained:

- warm off-white page background;
- white surfaces;
- near-black text;
- muted gray supporting text;
- muted forest-green accent;
- Georgia-style serif display typography;
- system sans-serif interface and body typography;
- rounded cards, controls, and figure media;
- thin, low-contrast borders;
- small uppercase labels with generous letter spacing;
- subtle 180 ms hover transitions;
- strong preference for content over interface chrome.

Share controls should feel like editorial utilities, not social-media branding embedded into the article.

### 4.2 Core design tokens

| Token | Value | Suggested sharing use |
|---|---|---|
| `--color-bg` | `#f4f4f0` | default page/button background |
| `--color-surface` | `#ffffff` | menu, toast, or sheet surface |
| `--color-text` | `#171717` | primary icon, label, border emphasis |
| `--color-muted` | `#5b5b57` | helper text and secondary actions |
| `--color-border` | `rgba(23,23,23,.12)` | default control/menu border |
| `--color-accent` | `#4a5d44` | focus ring, active/success emphasis |
| `--font-display` | Georgia serif stack | headings only, not compact utility labels |
| `--font-sans` | Inter/system stack | share controls and status text |
| `--radius-sm` | `.375rem` | small menu rows |
| `--radius-md` | `.75rem` | popover/toast |
| `--radius-lg` | `1.5rem` | bottom sheet or large panel |
| `--space-2`…`--space-7` | `.5rem`…`3rem` | gaps and component rhythm |

The site uses a `56rem` responsive breakpoint and a narrower `34rem` header adjustment. Article prose is capped at `42rem`; the article header is capped at `46rem`; the outer container is `72rem` with 1rem side gutters.

### 4.3 Existing control patterns

- Primary calls to action are dark, pill-shaped buttons.
- Secondary buttons use transparent backgrounds and a subtle border.
- Focus uses a two-pixel accent outline with a three-pixel offset.
- Hover can lift a button by one pixel.
- The mobile menu uses a rounded white popover with a soft shadow.
- Reduced-motion preferences collapse transition duration globally.

For share actions, use the secondary-button language. A primary black pill would give sharing too much visual weight relative to the article itself.

### 4.4 Design-system debt to account for

Some newer component styles refer to tokens not defined in `tokens.css`, including `--radius-pill`, `--transition-base`, `--color-inverse`, and `--color-surface-strong`. The live article layout mostly uses defined tokens, but the sharing work should not copy undefined variables. Either normalize these tokens as a small prerequisite or use the currently defined equivalents.

---

## 5. Sharing principles

1. **Make the object clear.** Labels must distinguish “Share article,” “Share chart,” and “Share quote.” An icon alone is ambiguous.
2. **Copy link is the universal baseline.** Native sharing and network links are enhancements; copying a canonical URL should always remain possible.
3. **Place actions where intent occurs.** Article sharing belongs near the title/meta and after the conclusion. Figure and quote actions belong with their captions/attribution.
4. **Keep reading primary.** Controls should be visible but low contrast until hovered, focused, or activated.
5. **Use progressive enhancement.** The page and core links must remain useful before the sharing script runs.
6. **Do not overclaim success.** “Link copied” is measurable. “Shared” is appropriate only after the native share promise resolves, and user cancellation is not an error requiring an alarming message.
7. **Share canonical content, not tracking URLs.** Add campaign parameters only when generating outbound destinations if the team has a clear attribution model; keep the copied URL clean by default.
8. **Preserve context.** Element-level links should land on a stable anchor and position the selected content below the sticky header.

---

## 6. Phase 1 specification: share an article

### 6.1 Placement

#### Primary placement

Place the sharing group directly after the existing metadata row and within the `46rem` article-header column.

Recommended vertical order:

```text
Topic
Article title
Deck
Byline • Published date • Updated date
Share controls
```

This location lets a reader share after scanning the premise without forcing them to scroll. Keep at least `--space-3` between metadata and the share group.

#### Secondary placement

Repeat a compact sharing group after the article body and before Sources. At this point the reader has completed the article and has higher sharing intent. The end-of-article version may include the label “Share this article” and should not be sticky.

#### Avoid initially

- A persistent left rail: the current body sits at the left edge of a wide container, so a rail is technically possible on desktop, but it introduces a new visual column and needs careful behavior around figures. It is not necessary for the first release.
- A sticky mobile footer: it reduces reading space, can obscure keyboard focus, and competes with browser controls.
- Controls on research cards: first validate demand and metadata quality on article pages.

### 6.2 Recommended control model

#### Mobile and capable devices

- **Share article** — invokes the native share sheet with title, short text, and canonical URL.
- **Copy link** — copies the canonical article URL.

#### Desktop or browsers without native sharing

- **Share article** — opens a compact anchored menu.
- Menu items:
  - Copy link
  - Email
  - Optional later: LinkedIn and X, if those destinations are strategically important

Keep Copy link visible outside the menu if testing suggests desktop users need it frequently. If both actions are visible, the group should be labeled with a visually presented or screen-reader label “Share.”

### 6.3 Why not a row of network icons

- The site does not currently maintain active network destinations in its configuration.
- A changing list of branded icons adds visual noise and maintenance overhead.
- Native sharing exposes destinations actually available on the reader’s device.
- Copy link and email are durable across platforms.
- Some networks change URL endpoints and branding frequently.

If network shortcuts are later added, keep them inside the menu on desktop and derive their share text from one central data object.

### 6.4 Component anatomy

```text
ShareActions
├── group label (“Share” or “Share this article”)
├── Share trigger
│   ├── share icon
│   └── visible text (“Share article”)
├── Copy-link trigger
│   ├── link icon
│   └── visible text (“Copy link”)
├── optional fallback menu
│   ├── Copy link
│   ├── Email
│   └── optional network destinations
└── status region (“Link copied” / failure guidance)
```

Use simple inline SVG icons with `aria-hidden="true"`; the visible label provides the accessible name. Do not add an icon dependency for two or three symbols.

### 6.5 Suggested dimensions

- Visible height: 40–44 CSS pixels on desktop.
- Touch target: preferably 44 by 44 CSS pixels; never below the WCAG 2.2 AA minimum of 24 by 24.
- Icon: 16–18 CSS pixels.
- Label: approximately the existing `--step--1` (`.875rem`) with medium/semibold weight.
- Horizontal padding: 12–16 CSS pixels.
- Gap between controls: 8 CSS pixels.
- Border: existing subtle border; darken on hover/focus.
- Radius: full pill, consistent with existing controls.

### 6.6 States

The designer should provide all of the following:

| State | Requirement |
|---|---|
| Default | Quiet secondary control; text and icon remain clearly legible. |
| Hover | Slightly darker border or faint background; optional one-pixel lift consistent with the site. |
| Focus visible | Existing two-pixel green outline, three-pixel offset. Do not rely on hover styling. |
| Pressed | No lift; slightly stronger surface/border. |
| Menu open | `aria-expanded="true"`; trigger remains visually selected. |
| Copy success | Label may temporarily become “Copied,” plus a polite live-region message. Keep the control width stable if possible. |
| Copy failure | Show “Couldn’t copy—select the address from your browser” or reveal a selectable URL; do not fail silently. |
| Native-share cancellation | Close/return to idle without an error toast. |
| Native-share failure | Fall back to the local menu or Copy link. |
| No JavaScript | Email remains a normal link; a canonical URL may be exposed as a normal link or the enhancement-only controls may remain hidden. |

### 6.7 Share payload

Recommended article payload:

```ts
{
  title: article.seoTitle ?? `${article.title} | Lookout West`,
  text: article.seoDescription ?? article.deck,
  url: canonicalUrl
}
```

The implementation should use the canonical production URL rather than blindly copying `window.location.href`, because readers may be on a preview domain or a URL with tracking parameters.

For email:

```text
Subject: {article title} — Lookout West
Body: {deck}\n\n{canonical URL}
```

Encode the subject and body with `URLSearchParams` or `encodeURIComponent`. Keep the email body concise.

### 6.8 Metadata prerequisite

Before launch, pass the article’s existing front-matter values through the route and layout:

- `seoTitle` → document/Open Graph/Twitter title;
- `seoDescription` → description tags;
- `cardImage` or a new `socialImage` → Open Graph/Twitter image;
- article type → `og:type="article"`;
- publish/update date → article metadata;
- optionally author and topic → article metadata/structured data.

Prefer a distinct `socialImage` field in the long term because card thumbnails and 1200×630 social previews have different crops and text-safe areas.

---

## 7. Phase 2 specification: share a chart or quote link

Phase 2 means sharing a URL that opens the article at a specific item. It does **not** yet guarantee a chart- or quote-specific social preview.

### 7.1 Content model prerequisite

Adopt reusable MDX components rather than decorating raw markup after render.

Recommended figure interface:

```ts
interface ShareableFigureProps {
  id: string;                 // stable editorial ID, e.g. "western-tax-bases"
  src?: string;
  alt: string;
  caption: string;
  label?: string;             // e.g. “Figure 1”
  source?: string;
  sourceUrl?: string;
  shareTitle?: string;
  shareText?: string;
  shareImage?: string;        // optional pre-generated social asset
  shareable?: boolean;
}
```

Recommended quote interface:

```ts
interface ShareableQuoteProps {
  id: string;
  quote: string;
  attribution?: string;
  shareText?: string;
  shareImage?: string;
  shareable?: boolean;
}
```

IDs are editorial identifiers and must remain stable after publication. Do not derive them only from captions that editors may rewrite.

### 7.2 Figure placement

Place **Share chart** in the figure caption area, after the caption/source—not floating over the data visualization.

Reasons:

- Overlay controls can cover labels or become unreadable against variable chart colors.
- The caption establishes what is being shared and contains attribution.
- The action remains available for images, SVGs, canvases, and future interactive charts.

On narrow screens, the caption content and action may stack. On wide screens, the action can align to the caption’s end only if it does not make the caption column difficult to scan.

### 7.3 Quote placement

Place **Share quote** below the attribution, aligned with the inset quote content. It should not interrupt the quote text or appear as part of the quotation.

Do not automatically make every paragraph selectable as a quote. Editors should explicitly mark quotable excerpts so the wording, context, and length are reviewed.

### 7.4 Deep-link behavior

- Figure URL: `https://lookoutwest.us/research/{slug}/#figure-{id}`
- Quote URL: `https://lookoutwest.us/research/{slug}/#quote-{id}`
- Add `scroll-margin-top` sufficient to clear the sticky header, likely 5.5–6rem.
- When arriving through a content anchor, briefly emphasize the selected content with a subtle border/background change. Respect `prefers-reduced-motion` and do not flash.
- Copy and email text should name the item and article.

Example chart text:

```text
Western states rely on very different tax bases — from “Who Pays for the Next West?” by Lookout West.
{anchored URL}
```

Example quote text:

```text
“{reviewed excerpt}” — Lookout West, “{article title}”
{anchored URL}
```

### 7.5 Content rules

- Quote excerpts should generally be 35 words or fewer for usability and network compatibility.
- Do not truncate a quotation in a way that changes meaning.
- Figure share text should describe the takeaway, not merely repeat “Figure 2.”
- Always preserve Lookout West and article attribution.
- Include source attribution inside chart assets when licensing or editorial standards require it.
- Alt text remains descriptive accessibility text; it should not be reused automatically as promotional share copy.

---

## 8. Phase 3 specification: share a chart or quote card

### 8.1 Why this is a separate phase

A URL fragment such as `#figure-western-tax-bases` is handled in the browser and is generally not a separate resource for social crawlers. Sharing that URL will usually produce the article’s default Open Graph preview, not the selected chart.

To produce item-specific previews, use one of these architectures:

#### Recommended for the current static site: pre-generated share pages

At build time, create a static page for each approved item:

```text
/research/{article-slug}/share/{item-id}/
```

Each page has:

- item-specific Open Graph title, description, and 1200×630 image;
- canonical or redirect relationship back to the anchored article;
- a visible fallback with the chart/quote and “Read the full article” link;
- `noindex,follow` if these utility pages should not appear in search results.

This fits Astro’s static-path generation and avoids adding a server runtime.

#### Alternative: dynamic social-image service

Introduce an image endpoint or external image-rendering service that accepts validated content IDs. This offers flexibility but adds hosting, caching, font, security, and failure-mode complexity that the current site does not otherwise have.

### 8.2 Asset templates

Design at least two 1200×630 templates:

#### Chart card

- Lookout West wordmark/brand label.
- Short chart title.
- Chart plotted large enough to remain legible in a small preview.
- Article title or topic as secondary context.
- Source line when applicable.
- Generous safe area around edges for platform cropping.

#### Quote card

- One reviewed excerpt, usually 20–35 words.
- Clear quotation marks or typographic treatment.
- Attribution/article title.
- Lookout West wordmark.
- Editorial background and accent color; avoid decorative imagery that competes with the words.

The cards should feel like the site—warm neutral, serif editorial headline, sans-serif utility details, muted green accent—not like generic social templates.

### 8.3 Image generation options

Because Sharp is already installed, a future implementation can generate assets at build time from SVG/HTML-derived templates and rasterize them to PNG. The preferred workflow should be deterministic and reviewed in pull requests.

Do not make browser-side canvas/DOM capture the primary path. It creates font-loading, cross-origin image, quality, accessibility, and browser-support problems and produces inconsistent results.

### 8.4 Native file sharing

Native file sharing can be offered only after feature testing with `navigator.canShare({ files })`. It requires a user gesture and secure context, and file-type support varies. The fallback should always share the dedicated URL or copy it.

---

## 9. Responsive behavior

### Desktop (greater than 56rem)

- Inline article controls under metadata.
- Anchored share menu aligned to the trigger and constrained to roughly 16–20rem.
- Menu must remain within viewport edges.
- Contextual figure/quote actions remain in caption/attribution flow.

### Tablet and mobile (56rem and below)

- Controls wrap without reducing targets below 44px preferred size.
- Use visible text; do not collapse all controls to unexplained icons.
- Prefer native share when available.
- If a custom picker is needed, choose either:
  - a simple in-flow disclosure/popover, or
  - a modal bottom sheet with focus containment and an explicit close action.
- Do not let a fixed control overlap the sticky site header, browser UI, article text, or keyboard focus.

### Very narrow screens (34rem and below)

- Allow a two-column group or full-width controls.
- Keep “Share article” and “Copy link” untruncated.
- If text replacement changes “Copy link” to “Copied,” preserve width to avoid layout shift.

---

## 10. Accessibility requirements

Treat WCAG 2.2 AA as the baseline.

### Semantics and names

- Use `<button type="button">` for actions and `<a>` for genuine navigation such as email/network URLs.
- Visible labels should include the accessible name: “Share article,” “Share chart,” “Share quote,” and “Copy link.”
- Decorative SVG icons use `aria-hidden="true"` and `focusable="false"`.
- A share menu trigger uses `aria-expanded` and `aria-controls`.
- A menu-like list of ordinary links/actions does not need ARIA `role="menu"`; that role adds desktop-application keyboard expectations. A labeled popover/disclosure is simpler.

### Keyboard and focus

- Every action works with keyboard alone.
- Focus order follows visual order.
- Escape closes popovers/sheets.
- Opening a nonmodal popover should move focus only if necessary; opening a modal sheet must move and contain focus.
- Closing returns focus to the trigger.
- Outside-click behavior must not replace explicit keyboard behavior.
- Focus must not be obscured by sticky/fixed UI.

### Targets and contrast

- Meet at least 24×24 CSS pixels or compliant spacing; target 44×44 as the product standard.
- Text contrast: at least 4.5:1 for normal text.
- Control borders/icons and focus indicators: at least 3:1 against adjacent colors where required.
- Do not communicate copied/open/selected state by color alone.

### Status feedback

- Put copy success/failure in a persistent `role="status"` or `aria-live="polite"` region.
- Do not move keyboard focus to a toast for successful copy.
- Keep success visible long enough to perceive; do not require a fast response.
- Distinguish cancellation from failure for native share.

### Motion

- Use the existing reduced-motion global rule.
- Any anchor highlight should use a simple color/border transition and remain understandable with transition duration removed.

### Content accessibility

- A shared chart image still requires useful alt text on the website.
- If charts contain essential information, provide a caption, summary, or accessible data table; sharing does not replace this obligation.
- Do not put essential attribution only into an image.

References:

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [WCAG status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)

---

## 11. Progressive enhancement and failure handling

### Capability order

1. Render stable, canonical links in HTML.
2. Enhance Copy link with `navigator.clipboard.writeText()`.
3. If clipboard writing fails, expose/select the URL or provide browser-copy guidance.
4. If `navigator.share` is available, use it from the direct click event.
5. If file sharing is later attempted, check `navigator.canShare({ files })` first.

Both Web Share and Clipboard writing require HTTPS and browser permission/user activation. Web Share is not supported uniformly, so the UX must not depend on it.

References:

- [MDN: `navigator.share()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
- [MDN: `navigator.canShare()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare)
- [MDN: Clipboard `writeText()`](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
- [Open Graph protocol](https://ogp.me/)

---

## 12. Analytics and measurement

No analytics or event library is currently present. The UI should not assume a specific vendor. Implement a small internal event contract so a provider can be connected later.

### Suggested event schema

```ts
type ShareEvent = {
  event: "share_interaction";
  action:
    | "open"
    | "native_share"
    | "copy_link"
    | "email"
    | "network_click"
    | "cancel"
    | "error";
  content_type: "article" | "figure" | "quote";
  article_id: string;
  content_id?: string;
  placement: "article_header" | "article_end" | "figure_caption" | "quote";
  method?: "native" | "clipboard" | "email" | "linkedin" | "x";
};
```

### Measurement rules

- Count a copy only after the clipboard promise resolves.
- Count native share intent separately from native share resolution; browser resolution semantics vary by platform.
- Do not call an external network click a completed share.
- Avoid sending quote text, full URLs with personal/tracking data, or other content payloads to analytics when IDs suffice.
- Do not fingerprint capability support.
- Track placement so the team can decide whether the header, end, or contextual controls earn their space.

### Initial success metrics

- Share-control activation rate per article view.
- Successful copy-link rate.
- Native-share activation rate on capable devices.
- Relative use of header versus article-end placement.
- Phase 2: figure/quote share rate by content ID.
- Error rate for clipboard/native share.

---

## 13. Proposed code and content changes

This is an implementation map, not a requirement that the UX designer write code.

### Phase 1

| File/area | Likely change |
|---|---|
| `src/content.config.ts` | Optionally add a dedicated `socialImage`; existing article fields already cover most payload data. |
| `src/pages/research/[slug].astro` | Pass SEO/social metadata and canonical sharing data into the layout. |
| `src/layouts/ArticleLayout.astro` | Render header and end-of-article sharing placements; pass article semantics to BaseLayout. |
| `src/layouts/BaseLayout.astro` | Support `og:type="article"`, article-specific image/title/description, and publish/update metadata. |
| `src/components/article/ShareActions.astro` | New reusable server-rendered component. |
| `public/scripts/share-actions.js` | New progressive-enhancement controller. |
| `src/styles/tokens.css` | Optional cleanup/addition of shared transition, pill radius, inverse, success, and shadow tokens. |
| `public/_headers` | Optionally declare `web-share=(self)` when native/file sharing policy is formalized. |

### Phase 2

| File/area | Likely change |
|---|---|
| `FigureBlock.astro` | Add stable ID, structured source/caption metadata, and scoped share action. |
| `PullQuote.astro` | Add stable ID and scoped share action. |
| Article MDX files | Replace raw figures selectively; introduce editor-approved pull quotes. |
| Prose/article CSS | Add anchor scroll margin and target-highlight state. |

### Phase 3

| File/area | Likely change |
|---|---|
| Content schema | Store approved share-card metadata. |
| Static route | Generate `/research/{slug}/share/{item-id}/` pages. |
| Build utility | Generate 1200×630 PNG assets, likely using existing Sharp dependency. |
| QA tooling | Validate duplicate IDs, missing assets, title lengths, and image dimensions during build. |

---

## 14. Content and editorial workflow

### Article publishing checklist

- SEO/social title reviewed.
- Social description reviewed.
- Social image supplied at an approved aspect ratio and crop.
- Canonical URL confirmed.
- Author, publish date, update date, and topic confirmed.
- Share copy avoids unexplained abbreviations.

### Figure publishing checklist

- Stable editorial ID.
- Figure label/title.
- Accurate alt text.
- Caption with takeaway/context.
- Source and source URL when applicable.
- Approved share text.
- Share-card asset if Phase 3 sharing is enabled.
- Legibility check at social-preview size.

### Quote publishing checklist

- Exact text verified against the article.
- Context preserved.
- Attribution verified.
- Length reviewed.
- Stable editorial ID.
- Approved share-card asset if enabled.

Only explicitly approved items should show contextual share controls. “Shareable” should be an editorial choice, not an automatic property of every figure or blockquote.

---

## 15. QA acceptance criteria

### Functional

- Canonical article URL is copied, without preview-domain host or accidental query parameters.
- Email subject/body are encoded correctly.
- Native sharing is offered only when supported.
- Canceling native share does not show a failure state.
- Copy failure provides a usable fallback.
- Multiple share components on one page initialize independently and only once.
- Anchored figure/quote links survive refresh and direct navigation.
- Duplicate content IDs fail validation or are caught in review.

### Responsive

- Test at 320px, 375px, 768px, 896px, 1024px, and wide desktop.
- Controls do not overflow long titles or localized/system font differences.
- Popovers remain inside viewport edges at zoom up to 200%.
- No horizontal page scrolling is introduced.
- Sticky header does not cover anchor targets or focused controls.

### Accessibility

- Keyboard-only completion of every path.
- Screen reader announces control names, expanded state, and copy result.
- Focus returns correctly after close.
- Focus ring is visible against every state.
- Targets and spacing meet the stated standard.
- High contrast/forced colors remain usable.
- Reduced-motion mode is calm and complete.

### Metadata and previews

- Validate the production URL, not only localhost.
- Confirm title, description, image, and canonical tags in built HTML.
- Test article previews with the relevant platform debuggers before release.
- Confirm social images are absolute HTTPS URLs, fetchable without authentication, and appropriately sized.
- Confirm utility share pages have the intended indexing policy.

### Browser/device matrix

- Current Safari on iOS and macOS.
- Current Chrome on Android, Windows, and macOS.
- Current Firefox on desktop and Android.
- Current Edge on Windows.
- At least one environment without native Web Share.
- At least one clipboard-denied/failure simulation.

---

## 16. Designer deliverables

The design handoff should include:

1. Article-header share group at desktop, tablet, and mobile widths.
2. Article-end share group at the same widths.
3. Desktop fallback popover.
4. Mobile native-share state and, if needed, custom bottom-sheet alternative.
5. Figure-caption share placement.
6. Pull-quote share placement.
7. Default, hover, focus, pressed, expanded, success, error, and disabled/unavailable states.
8. Long-title, long-label, and narrow-screen stress cases.
9. Two 1200×630 Phase 3 templates: chart and quote.
10. Exact spacing, typography, icon size/stroke, border, shadow, and responsive specifications.
11. Keyboard focus order and annotated accessibility behavior.
12. Motion notes, including reduced-motion equivalents.

Use real Lookout West article titles, charts, and copy in the mockups. At minimum, test with:

- the long title “Who Benefits From State Corporate Tax Cuts? A Local Labor Markets Approach With Heterogeneous Firms” as a stress case;
- the “Tax bases” chart from `taxes-in-the-west.mdx`;
- a table figure from `data-centers.mdx`; and
- one editor-selected quote of approximately 30 words.

---

## 17. Decisions needed before implementation

The product owner and designer should settle these points:

1. Is the Phase 1 control a two-button group or one Share button with Copy link inside its menu?
2. Is native sharing the primary mobile action, with a custom menu only as fallback?
3. Are Email, LinkedIn, and X strategically important enough for explicit shortcuts?
4. Should article-end sharing repeat the full group or use one compact prompt?
5. Should social previews use article card images immediately, or should dedicated 1200×630 social images be created first?
6. Which existing figures are editorially approved for contextual sharing?
7. Will selected quotes be added manually by editors?
8. Should Phase 3 utility pages be `noindex,follow`?
9. Which analytics/privacy approach will receive the internal event contract?
10. Is URL campaign attribution needed, and if so, where should parameters be added without contaminating canonical/copied URLs?

### Recommended defaults

- Two visible Phase 1 actions: **Share article** and **Copy link**.
- Native share on capable devices; compact local menu elsewhere.
- Email in fallback menu; no network-specific buttons at first.
- Compact repeat group at article end.
- Add dedicated `socialImage` metadata and correct article Open Graph fields before launch.
- Convert only selected high-value figures to the structured component initially.
- Hand-select quotes; never auto-extract them.
- Make Phase 3 share pages `noindex,follow` and link visibly back to the article.
- Copy clean canonical URLs.

---

## 18. Suggested rollout

### Release A — foundation

- Correct article-specific metadata.
- Add `ShareActions` and local sharing script.
- Implement header and article-end placements.
- Implement copy, email, native share, status feedback, accessibility, and QA.

### Release B — contextual links

- Finalize figure and quote component designs.
- Add stable IDs and anchor behavior.
- Convert a small pilot set of figures.
- Add two or three editor-selected quotes.
- Measure use and gather qualitative feedback.

### Release C — visual assets

- Design chart and quote card templates.
- Add structured share metadata.
- Generate static item-specific pages and social images.
- Add native file sharing only as a tested enhancement.

### Release D — optimization

- Review placement performance.
- Remove low-value destinations.
- Improve editorial tooling and validation.
- Consider card-level sharing or selection-based quote sharing only if evidence supports it.

---

## 19. Final recommendation

Start with an understated, labeled two-action group—**Share article** and **Copy link**—under the article metadata, repeated more quietly after the article. Build it as static HTML plus a small same-origin JavaScript enhancement, matching the site’s existing interaction architecture.

In parallel, fix article-level social metadata. Without that foundation, a polished share button can still produce a generic or misleading preview.

Treat chart and quote sharing as a content-model project as much as a UI project. Stable IDs, captions, source data, approved excerpts, and share-specific assets are what make advanced sharing trustworthy and maintainable. Once those are structured, the current Astro build is well suited to generating reliable anchored links and dedicated social-preview pages without turning Lookout West into a heavy client application.
