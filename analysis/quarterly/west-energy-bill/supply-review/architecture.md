# SupplyStory first pass: architecture audit

Before editing, traced SupplyStory.astro → SupplyDiagram.astro; EnergyStory.astro → energy.css + initializeEnergy(document) → enhanceSupply in enhance.ts → resolveSupplyStep in model.ts. No Scrollama or animation dependency is present.

The old observer watched only the four h3 elements, inside a broad viewport band whose upper edge was header height + 104px. A fast jump could cross that whole band without an observed intersection. Hash changes were not handled explicitly. Resize/pageshow removed sticky enhancement before rebuilding it, temporarily restoring long static content and changing document geometry.

CSS had three generations of supply rules: 60/64/65vh pacing, multiple gutters and panel backgrounds, and competing print/mobile overrides. Future diagram groups remained at 12–13% opacity. Four identical circles and remote bottom annotations obscured the mechanisms. A nodes list repeated both the prose and the graphic.

First-pass direction: persistent semantic objects and connections; full state derived from one stage index; CSS-only pin/release; step territory near 82svh; stable 45% activation line, with observer and an event-driven, coalesced scroll check for fast jumps; static accumulated diagrams for narrow, short, no-JS and print layouts. Preserve all reported figures, links, qualifications, article sections and visual tokens.
