# Lookout West sharing design plan

Prepared September 8, 2026. Scope: repository investigation, current web research, and a proposed design and implementation sequence. Website functionality has not been changed.

**Recommendation**

Add a small, reusable sharing system with two visible article actions: **Share** and **Copy link**. Put them below the byline and dates and repeat them after the article body, before Sources. Share opens a compact set of destinations; include device sharing where available. Give selected charts their own link and download actions. Repair social-preview images as part of the first release.

This plan updates the recommendations in [the August UX brief](share-experience-ux-brief.md). The earlier brief is useful background, but its inventory and some assumptions are stale. In particular, reader sharing does not require Lookout West to maintain an account on each destination network. Include the requested network shortcuts in the first release rather than waiting for analytics.

**What the repository actually contains**

| Finding | Evidence | Design implication |
| --- | --- | --- |
| Static Astro 6 application with MDX content, TypeScript, plain CSS, and small local scripts | `package.json`, `astro.config.mjs`, `public/scripts/` | Use server-rendered markup and a small same-origin script. No client framework or sharing service is needed. |
| Seven non-draft articles, all rendered through one route and layout | `src/content/articles/`, `src/pages/research/[slug].astro`, `src/layouts/ArticleLayout.astro` | One shared component can cover every article. |
| 21 authored figure blocks, including photos and a table; no figure IDs found | MDX article inventory | Select meaningful charts for contextual sharing; do not automatically turn every image into a share card. |
| No interactive chart embeds or active explorer implementation found | MDX content; empty `src/layouts/ToolLayout.astro`, `src/pages/tools/index.astro`, and tool components; planned State Comparison Explorer content | Current visualization work means sharing static figures. Design for future filtered tools without building a tool as part of this task. |
| `FigureBlock.astro` exists but is not used by the articles | Component and MDX imports | Extend it and migrate a small pilot before converting the remaining figures. |
| Canonical URLs and Open Graph/X tags already exist | `src/layouts/BaseLayout.astro` | Retain this foundation and centralize URL generation. |
| Both `public/social/og-default.jpg` and `og-article.jpg` are zero-byte files | File-size and file-type checks | Replace the empty fallback. It cannot serve as a valid social image. Actual production responses were not verified. |
| Article metadata is not passed through to the base layout | Article route omits `seoTitle`, `seoDescription`, and `cardImage`; ArticleLayout passes only title and deck to BaseLayout | Every article currently references the same empty fallback in the source configuration. Wire in deliberate article previews. |
| All seven article card images decode, but dimensions vary, and two `.png` files contain WebP/JPEG data | Read-only Sharp metadata inspection | Produce explicitly encoded social assets with matching extensions, dimensions, and MIME types. Avoid depending on arbitrary thumbnail crops. |
| Newsletter signup uses Buttondown | `src/components/navigation/SubscribeModal.astro` | Substack is an external reader destination, not an existing publication/restack integration. |
| Restrained cream, charcoal, and forest-green visual system; 46rem article header and 42rem prose | `src/styles/tokens.css`, ArticleLayout, prose CSS | Use quiet outlined controls, small icons with text, and the existing focus treatment. |
| CSP restricts scripts and connections to the same origin; no analytics integration found | `public/_headers`, source search | Use ordinary destination links and local interactions. Tracking is a later integration, not a launch dependency. |

Figure counts by article: Cost of the West 3; Data Centers 3; Demographics/Fertility 1; Land 4; Taxes 2; Growth 3; Water 5. These are figure counts, not a claim that all 21 are charts or export-ready.

The browser runtime reported no available browser. The web fetch of Lookout West also failed. Findings about this website therefore describe the checked-out source, not a completed live/mobile visual audit. Hosting headers look like Cloudflare Pages configuration, but the deployed host and effective response headers remain to be confirmed.

**What to borrow from established publications**

The Guardian repeats Share near article metadata and after the article. [Example article](https://www.theguardian.com/media/2026/sep/04/canary-staff-not-paid-amid-fears-for-news-websites-future).

Our World in Data provides chart downloads and a Share action with embedding options. Its documentation explains that chart URLs retain selections. These are useful precedents for contextual chart controls, image export, attribution, and future state-preserving tool links. [OWID user guidelines](https://ourworldindata.org/faqs).

These are observed patterns, not evidence that a particular arrangement will maximize Lookout West sharing. The proposed placement and destination order are design judgments to validate with readers.

**The reader experience**

The default article header remains editorial, with two secondary controls:

```text
What Data Centers Ask of the West
Article introduction / deck
By Henry Rawlings · Published …

[ ↗ Share ]  [ ⧉ Copy link ]
```

Share opens an anchored panel on desktop and a compact dialog styled as a bottom sheet on narrow screens. Use the same destinations in both. This adds one deliberate step before native device sharing, but keeps the named destinations discoverable even when their apps are not installed. It also gives Instagram and Substack room for honest instructions. Copy link stays one tap away outside the panel.

Suggested panel order:

```text
Share this article                     Close

Share via your device…    [when supported]
LinkedIn     X     Facebook     Email

Substack Notes — copy link to paste
Instagram — copy link / prepare image

lookoutwest.us/research/data-centers/
[ Copy link ]
```

LinkedIn leads the network group as a hypothesis about the publication's professional research audience. The site has no usage data establishing a preferred network. Keep this ordering configurable. Messages, WhatsApp, and other apps can appear through the device's share sheet; their availability depends on the device and payload. [Web Share behavior](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).

At the article end, use the same controls with a short “Share this article” label. Keep the controls in the normal document flow. There is no initial need for a floating rail, sticky mobile bar, share counts, or controls on every research card.

Use the current cream/white surfaces, charcoal text, and green focus ring. Controls should have 44px targets, approximately 16px icons, visible labels, and about 8px between controls. Keep network marks within their brand usage rules. The 44px size is our preferred design target; WCAG 2.2 AA specifies 24px or applicable spacing/exceptions. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

**Platform behavior and limits**

| Destination | Proposed behavior | Implementation note |
| --- | --- | --- |
| Copy link | Copy a clean production URL. Show “Link copied” only on success. | On failure reveal/select a readable URL for manual copying. The Clipboard API requires HTTPS and can reject access. [Clipboard documentation](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText). |
| Device sharing | Open the operating system share sheet from an explicit button click. | Feature-detect; installed targets and accepted data vary. Cancellation returns quietly to the panel. A resolved promise is not proof that a post was published. [Web Share documentation](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share). |
| X | Open a composer with a concise headline and article URL. | X documents web intents without app authorization. Use a normal link to `https://x.com/intent/tweet` with encoded `text` and `url`; no widgets script is needed. [X web intents](https://docs.x.com/x-for-websites/web-intents/overview). |
| LinkedIn | Open LinkedIn's sharing composer with the article URL. | Candidate lightweight URL: `https://www.linkedin.com/sharing/share-offsite/?url=…`. Validate the current login/composer handoff before release. LinkedIn's retrieved official documentation describes its script-based share plugin, not a stability guarantee for this URL. [LinkedIn share plugin](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/plugins/share-plugin). |
| Facebook | Open Facebook's sharing composer with the article URL. | Candidate lightweight URL: `https://www.facebook.com/sharer/sharer.php?u=…`. Validate before release. The alternative Share Dialog requires checking its current app configuration requirements. Meta's documentation was rate-limited during this research, so its exact current contract is a verification item. |
| Substack Notes | Expand a small helper with “Copy link” and “Open Substack Notes”; explain that the reader pastes into a new note. | Substack documents sharing links in Notes. No supported external-site restack/composer endpoint was confirmed. Do not label this as a restack or silently copy text when opening the panel. [Substack Notes guide](https://support.substack.com/hc/en-us/articles/14564821756308-Getting-started-on-Substack-Notes). |
| Instagram | Initially help readers copy a link for a message or Story. Add a designed image download and explicit link-copy action in the visual-sharing release. | Do not promise direct website-to-Story publication. Native file sharing is a tested enhancement only; the site cannot force Instagram to appear or turn an image into a tappable link. Instagram app-to-app flows are different from ordinary website link composers; X's own documented Story flow is explicitly through its iOS app. [X's Instagram Story flow](https://help.x.com/en/using-x/instagram-stories-share). |
| Email | Open the reader's email composer with headline, one short sentence, and URL. | Use an encoded `mailto:` link; Copy link remains available if the reader has no mail handler. |

External actions open a normal new tab with `rel="noopener noreferrer"`; avoid popup sizing logic. The reader always chooses whether to publish. Omit a `via` handle unless a real Lookout West handle is configured. Profile/follow links in `site.social` should not be mistaken for share links.

**Release 1: article sharing and working previews**

1. Add one shared URL/payload helper. For articles, use the production origin and normalized article path, removing incidental campaign parameters and fragments. Preserve the existing route IDs, including `demographics_fertility`.
2. Pass metadata from the article route through ArticleLayout to BaseLayout. Use `seoTitle` for the document title and the full editorial headline for sharing by default; some existing SEO titles are much shorter than the article headlines. Use `seoDescription ?? deck` for descriptions.
3. Add optional `socialImage` and `socialImageAlt` fields, using a valid article card image as an interim fallback and a real branded default when neither is present. Emit absolute image URLs, `og:type="article"`, publication/update dates, image dimensions, `og:image:alt`, and `twitter:image:alt`. The Open Graph protocol supports image dimensions and alt descriptions. [Open Graph specification](https://ogp.me/).
4. Prepare an initial 1200×630 preview for each article and the site fallback. This is a chosen production template, not a claim that every platform uses precisely the same crop. Keep headings, brand, and key artwork away from the edges. Explicitly encode JPEG/PNG output rather than just renaming existing files.
5. Build `ShareActions.astro`, the shared panel, and one local script. Mount the actions at the two article positions. Show the requested network destinations immediately, with the Instagram/Substack helper behaviors described above.
6. Provide progressive enhancement: ordinary network/email links and a canonical URL must remain reachable without JavaScript, for example through a native disclosure fallback. Hide enhancement-only buttons until initialized. Keep Escape, focus return, and overlay behavior consistent with the existing subscription dialog.

The current Permissions Policy does not explicitly block Web Share. Its default allowlist is `self`; adding `web-share=(self)` can document intent but is not a newly discovered prerequisite for top-level sharing. Verify actual deployed headers. [Permissions Policy reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/web-share).

**Release 2: share a specific chart**

Pilot one chart from Growth, one from Taxes, and the Data Centers table to exercise different layouts. Give each a permanent author-specified ID, a readable title/caption, source, and optional downloadable asset. Offer **Share chart** and **Download image** alongside the caption; omit download until a suitable export exists. Use “Share table” where appropriate.

Example target: `https://lookoutwest.us/research/west-growth-drivers/#figure-growth-drivers`. Keep IDs stable through wording and ordering edits. Add scroll margin for the sticky header and a restrained `:target` treatment. Reserve image dimensions to prevent late image loading from moving the target.

Extend `FigureBlock.astro` before adopting it. Its current fixed aspect ratio, overflow clipping, and `object-fit: cover` are inappropriate defaults for research charts. Preserve the full plot, axes, legend, and attribution. Keep tables usable with horizontal scrolling, rather than forcing them into a media crop. Scope prose CSS carefully so a figure's share panel is not treated as full-width chart media.

A `#figure` link scrolls to a chart but does not give the link a different social preview. URL fragments are not sent to the server; therefore the initial article metadata remains the same. [URI fragment behavior](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment).

Apply the same sharing payload contract to future real tool pages. Include an allowlisted, validated set of state parameters such as selected states, metric, and period, so the recipient sees the same view. Unlike ordinary article URLs, these meaningful query parameters must survive sharing. Do not build this serialization until the tool and its actual state model exist.

**Release 3: visual cards and useful Instagram sharing**

Create reusable export templates for selected charts and article teasers:

- 1200×630 landscape for link previews.
- 1080×1350 portrait for social image posts.
- 1080×1920 Story composition, with space around the top/bottom app controls.

These are proposed design canvases to test on devices. Recompose dense charts for the canvas instead of cropping labels or reducing them until unreadable. Preserve the data, units, period, source credit, Lookout West attribution, and visible domain. Use editorially faithful titles. Do not fabricate charts or use generative imagery to recreate quantitative marks.

The Instagram helper shows a preview, **Download image**, and **Copy article link**. Explain the remaining action in one sentence: add the image in Instagram and paste the URL in a message or a Story link sticker. A URL printed inside the image is not an interactive link.

Generate exports ahead of time using existing source images and a deterministic template, with Sharp for raster processing. Avoid browser DOM screenshots as the production export pipeline. Support file sharing only when `navigator.canShare({files})` succeeds; prepare the file before the final share click so transient user activation is preserved. Keep download/copy as fallbacks. [Native file sharing](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).

If a chart needs its own preview when someone posts its URL, give it a real static page, such as `/visualizations/west-growth-drivers/growth-drivers/`, with its own title, image, canonical URL, and `og:url`. The page should show the chart, source, caption, and a visible “Read the full article” link. Do not immediately redirect to the article or point `og:url` back to the parent, which may cause platforms to consolidate the preview. A thin utility page can be `noindex,follow` while remaining fetchable; confirm behavior in preview tools before launch.

Selected quote cards can later reuse these templates if there is editorial demand. Arbitrary text-selection sharing and automatic quote extraction are outside the initial scope.

**Implementation map**

| Area | Proposed work |
| --- | --- |
| `src/content.config.ts` | Validate optional social-image fields; later add structured figure/export metadata. |
| `src/lib/urls.ts`, new `src/lib/share.ts` | Production URL normalization and destination/payload construction. The URL helper is currently empty. |
| `src/pages/research/[slug].astro` | Pass article SEO and social metadata into the layout. |
| `src/layouts/BaseLayout.astro` | General metadata props for page type, image details, dates, and explicit URL overrides for future visualization pages. |
| `src/layouts/ArticleLayout.astro` | Header/end placements and article share payload. |
| New `src/components/sharing/ShareActions.astro` and `SharePanel.astro` | Shared labeled controls, panel, fallback links, and status regions. |
| New `public/scripts/share-actions.js` | One initialized local module for panel, clipboard, native sharing, and helper flows. |
| `public/social/` and optional build script | Valid default, per-article previews, later visual exports. |
| `src/components/article/FigureBlock.astro`, selected MDX, prose CSS | Stable anchors, uncropped chart presentation, contextual actions. |
| Future visualization route and tool layout | Dedicated chart previews and real tool-state sharing when those releases begin. |

No publishing-account connection, posting API, new database, or external sharing SDK is needed for the proposed reader-driven flows. Keep Facebook/LinkedIn URLs centralized because their composer handoffs still require validation.

**Acceptance criteria before release**

- All seven article URLs share the intended full headline, description, and valid image. Inspect generated HTML and decode referenced assets; require nonempty files and matching extension/MIME types.
- The deployed page and image return successful public responses without login, crawler challenges, or an HTML error page masquerading as an image. Check previews with Facebook Sharing Debugger and LinkedIn Post Inspector, then a manual X/message preview. These checks remain future work.
- Clipboard success, rejection, unavailable API, native cancellation, absent native sharing, and repeated actions all behave clearly. No success message claims that an external post was published.
- Native sheet availability is capability-based, not user-agent sniffing. Actual iOS Safari and Android Chrome checks cover URL and later file payloads; desktop Safari/Chrome/Firefox cover fallbacks.
- Keyboard users can open the panel, reach every action, close it with Escape, and regain the triggering control. Dialogs trap focus only when modal. Use normal links/buttons instead of ARIA menu roles unless the full menu keyboard model is implemented.
- “Link copied” is announced in a polite status region. Focus indicators and contrast remain visible. Test narrow screens, zoom/reflow, long titles, and multiple share groups without duplicate IDs or handlers.
- Copying from an article with tracking parameters produces the clean canonical URL. Chart actions preserve their assigned fragment. Future tool links preserve meaningful filter state.
- Chart anchor navigation works after images load. Exports retain labels and source information. Existing navigation and subscription overlays continue to work.
- Run `npm run check` and `npm run build` during implementation. Add focused checks for URL encoding, canonical/state handling, and invalid social assets; do not expand this task into unrelated testing infrastructure.

Later measurement can record panel opens, destination clicks, completed copies, and image-download clicks with article/figure IDs and placement. There is no current analytics receiver, and telemetry should not delay the feature. Network clicks and native handoffs measure intent, not published posts. Use brief reader testing to see whether people can share an article to a colleague, locate a chart link, and prepare a Story without assistance.

The recommended delivery order is article controls plus valid previews, then contextual chart links, then visual exports and chart-specific preview pages. Each release has a useful standalone outcome.
