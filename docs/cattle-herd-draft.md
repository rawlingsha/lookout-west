# Cattle herd article

The article lives in `src/content/articles/cattle-herd.mdx`. It was originally
added as a draft; its frontmatter now has `draft: false`. Published articles use
the normal header and footer sharing controls. The article route is
`/research/cattle-herd/`.

The supplied images are stored in `public/images/research/cattle-herd/`.
`cattle-and-cowboys-card.jpeg` is the card image, with framing set in the article
frontmatter for regular and wide homepage cards. The Benton reproduction remains
in the article before the sources section.
The five charts appear beside the introductory price/herd comparison, regional
receipts, heifer-retention economics, processing geography, and drought policy.

All five use `ShareableFigure` and are registered in
`src/data/share-figures.json`. Each retains its original anchor, caption, alt
text, and image proportions, with Share chart, Copy link, and Download image
controls. Selecting the image opens the full-size PNG. Dedicated chart pages
live at `/visualizations/cattle-herd/<figure-id>/` and link back to the article.
The registered IDs are `price-and-herd`, `state-scale-and-dependence`,
`rebuilding-timeline`, `processing-and-feedlots`, and `drought-exposure`.

Run `npm run images:share` when changing images or registering charts during an
existing dev session. The npm dev/build commands generate PNG downloads and
landscape, portrait, and Story previews automatically at startup.

See [the sharing authoring instructions](sharing-implementation.md#authoring)
for future essays and charts. Registering a chart requires a published parent
article; the generator currently rejects figures belonging to drafts.
