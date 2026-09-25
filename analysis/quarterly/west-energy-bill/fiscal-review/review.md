# Section 03 review — 22 September 2026

## Implementation

Replaced the matching household/public-revenue cards with one semantic mechanism: local crude production → broader price formation, then distinct refinery/fuel-market and production-value/tax/royalty processes. A visibly longer fiscal route leads to a New Mexico FY2027 evidence panel. The $10 full-year-average assumption and approximately +$565m direct sensitivity are paired; the latter remains calculated through the existing model. No household number or budget mirroring remains in Section 03.

Retained the original source lookup, pages 16 and 41, secondary sensitivity table, existing sharing infrastructure, and old `#two-ledgers` incoming anchor. Added descriptive `#oil-state-paradox` and `#fiscal-mechanism` anchors. Removed unused ledger/paradox styles and enhancer. No new dependency, palette, font, or data model.

## Editorial review

A — Economic integrity: passes. No opposing household estimate, rebate arrow, or offset identity. The origin link is explicitly labeled “Price formation,” with no physical barrel animation or geographic claim. The estimate is conditional on a full-year average versus the August forecast, with other assumptions held constant. The nearby caveat says it is neither collected cash nor a household rebate nor net economic gain; the conclusion repeats the welfare distinction at readable editorial size.

B — Voice: used the supplied copy baseline, naming crude markets, refinery, regional fuel system, station, taxes, royalties, state budget and funds. Only the H2 poses a question. Added only the precise connection label “Price formation.” The scan shows local production, broader valuation, retail fuel stages, a separate fiscal process, and the conditional New Mexico example.

C — Visual/engineering: one asymmetric graphic, restrained forest/ink/blue roles, no red/green coding, no decorative imagery, semantic headings/lists/paragraphs retained. Decorative connectors use empty CSS shapes or aria-hidden spans. DOM order follows the mobile reading order. Static content is complete without JS. A short opacity sequence runs once, with no number animation or sticky behavior. Reduced motion, delayed initialization, restored pages, and observer failure complete immediately. Keyboard focus completes any pending reveal.

## Visual passes and validation

First pass: reviewed the live localhost article, desktop heading/intro and split mechanism, and vertical mobile sequence. Second pass: corrected paragraph specificity, replaced generated arrow text with decorative geometry, refined the mobile connection into the evidence panel, and reviewed the final tablet/laptop layouts and emphasized conclusion.

Inspected 1440×1000, 1280×800, 768×1024 and 390×844. No horizontal overflow. The complete mechanism fits a laptop viewport when framed at its start. Mobile retains readable 13.6px stage labels and 15px explanations. Keyboard Enter opens/closes the sensitivity table with visible focus; three cases remain. Source link has a 44px target. Screenshots are stored beside this report.

Astro check: 86 files; 0 errors, 0 warnings, 0 hints.
Production build: 36 pages; successful.
Energy and sharing tests: 39 passed.
`git diff --check`: clean.
Production browser console: no errors.

Lint cannot run: pre-existing missing ESLint 10 configuration. The development page logged an Astro dev-toolbar dependency fetch error during dependency re-optimization; the production build does not contain the toolbar and its browser console is clean. Reduced motion was verified through lifecycle tests and the explicit media-query static override; a native OS preference switch was not performed.
