# PricePulse review — 22 September 2026

Replaced the endpoint bars with locally archived monthly BLS observations (February–August 2026), rebased in one shared geometry/model module. Article, SVG/PNG downloads and existing share exports use the same final chart. The May peak is 140.8, requiring a 95–145 domain. No runtime data fetch or new library.

Two visual passes refined the desktop heading/intro composition, label contrast, mobile endpoint stack and restrained utility controls. Inspected captures: desktop-1440.png, laptop-1280.png, desktop-1728.png, mobile-390.png, mobile-390-controls.png, mobile-430.png. No horizontal overflow at those widths. Fresh deep links and refresh retain the completed chart. An initial stale scroll position was corrected after navigating to a fresh review URL.

Validation: Astro check 85 files, zero errors/warnings/hints; production build 36 pages; 37 energy and sharing tests pass. Tests cover provenance anchors, straight shared-scale paths, one-time reveal, reduced motion, delayed initialization, restoration, observer failure, and explicit anchor/history handling. Static export inspected. Existing Georgia serif retained; Libre Baskerville is not registered.

Limits: native 125%/150% browser zoom could not be reliably set with the active UI connection; not claimed as verified. Reduced motion and delayed-JS behavior verified by automated lifecycle tests and static markup/CSS inspection, not a throttled browser session. Lint is unavailable because the existing repository has no ESLint 10 configuration. No changes to SupplyStory content/styles or later story sections were required.
