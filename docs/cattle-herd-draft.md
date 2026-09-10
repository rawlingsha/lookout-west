# Cattle herd article draft

The article lives in `src/content/articles/cattle-herd.mdx` with `draft: true`.
Its title, deck, byline, date, prose, tables, and source notes come from the supplied
September 9, 2026 manuscript. The site applies its normal article typography.

Run `npm run dev` and open `/research/cattle-herd/` to review the full draft.
Draft article routes exist only in the development server; `npm run build` and
`npm run preview` exclude them. The preview has an unpublished label, `noindex`,
and no sharing controls. Following the existing site convention, research and
topic indexes show a non-clickable **Forthcoming / In development** card. Drafts
are not private storage: their teaser metadata and files under `public/` are
included in production output.

The six supplied images are stored, without alteration, in
`public/images/research/cattle-herd/`. The Benton reproduction is the card image.
The five charts appear beside the introductory price/herd comparison, regional
receipts, heifer-retention economics, processing geography, and drought policy,
respectively. Each chart retains its proportions, has descriptive alternative
text and a caption, and links to its full-size PNG. The three tables have row and
column headers and keyboard-accessible horizontal scrolling.

Checks completed: Astro diagnostics, production build, existing sharing tests
(updated to check draft exclusions), and a comparison of rendered draft content
against the supplied manuscript: 50 body paragraphs/headings, 50 source links,
and all 116 table cells. Visual browser review remains outstanding because no
browser connection was available. No deployment was performed.

When editorial review is complete, changing `draft` to `false` enables the public
article route and normal article sharing on the next build. The existing image
generator will then create its social images from the Benton card image. Chart
sharing pages can be registered separately after publication if desired.
