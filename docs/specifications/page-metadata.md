---
title: Page Metadata
categories:
  - spec
---

# Page Metadata

Four components render metadata sourced from the [site graph](/specifications/metadata)
(`public/site-meta.json`), not frontmatter: `PageHeader` (publish date, reading time) and
`TagList` (the page's curated `page_tags` chips — see the
[Metadata Contract](/specifications/metadata#page-tags)) render below the title via
`theme.config.jsx`'s `PageMeta` helper; `SectionMarker` (an invisible scroll anchor, one
per heading) is injected automatically by the ingest pipeline; `MetaSidebar` renders in the
right ToC column via `toc.extraContent`. `theme.config.jsx` indexes the graph by
`useRouter().route` to find the current page node; `SectionContext`
(`components/SectionContext.jsx`, provided in `_app.jsx`) tracks which section is
currently scrolled into view and shares it between the content area and the sidebar.

## Requirements

1. REQ-1: `PageHeader` renders a formatted date when the page's `published` field is present
2. REQ-2: `PageHeader` renders reading time in minutes when `metrics.reading_time` is present
3. REQ-3: A separator `·` appears only when both date and reading_time are present
4. REQ-4: `PageHeader` returns nothing when neither is provided
5. REQ-5: `TagList` renders every populated tag group except `keywords` as chips — the standard groups get a named `chip-<group>` class, any other configured group falls back to `chip-custom`
6. REQ-6: `TagList` returns nothing when no group has terms
7. REQ-7: `PageMeta` (date, reading time, the page's curated `page_tags` chips) renders below the page title, ahead of the rest of the page's content
8. REQ-8: `SectionMarker` is injected after every `##`/`###` heading at ingest time (`<SectionMarker i={N}/>`, document order) and renders no visible content
9. REQ-9: `SectionMarker` reports its scroll position (via `IntersectionObserver`) into `SectionContext` so the currently-viewed section can be tracked
10. REQ-10: `MetaSidebar` renders, in order: `desc`, tags (the active section's full `tags`, or the page's curated `page_tags` when no section is active), `keywords` + `metrics` (same fallback), a combined "Related" list, then an "Edit this page" link — always last
11. REQ-11: `metrics.word_count` is computed by the ingest pipeline from page content (always present); `metrics.reading_time` is words / 200 rounded, minimum 1 minute
12. REQ-12: `MetaSidebar`'s combined "Related" list merges the page's own `links` with taggly's `related` pages — an internal link is shown as the linked page's name (via `find_page`), not its raw path; an unresolved (e.g. external) link falls back to its raw href
13. REQ-13: `SectionContext` resets the active section synchronously when the page changes, so a render can never pair a stale active index with the new page's (possibly shorter) section list; `MetaSidebar` additionally falls back to the page's own data if the active index is ever out of range
14. REQ-14: `SectionContext` force-activates the last section once the page has been scrolled as far as it will go, since the last section's own marker often can't cross the near-top scrollspy band (too little trailing content to scroll it that far)
15. REQ-15: The ToC column (`.nextra-toc`) keeps Nextra's default sticky behavior — pinned near the top of the viewport with its own capped-height scrollbar — so the heading list stays fixed while the body content scrolls

## Test Cases

Coverage by file, mapped to the requirements above:

- `tests/components/PageHeader.test.jsx` — date/reading-time rendering, separator, empty state (REQ-1 – REQ-4)
- `tests/components/TagList.test.jsx` — renders non-keyword groups with the right chip class, empty states (REQ-5, REQ-6)
- `tests/build/ingest.test.js` — marker injection order and placement, fence/heading-depth exclusions (REQ-8)
- `tests/components/SectionMarker.test.jsx` — no visible output, observer registration, reports its own index (REQ-8, REQ-9)
- `tests/components/MetaSidebar.test.jsx` — section ordering with edit link last, active-section tags/keywords override the page's curated set, tags block omitted when empty, links resolve to page names (or fall back to the raw href), links and related share one "Related" section, edit link hidden without a repo url, falls back safely on an out-of-range active index (REQ-10, REQ-12, REQ-13)
- `tests/components/SectionContext.test.jsx` — `find_page` normalization, synchronous reset on page change, last section forced active at page bottom (REQ-13, REQ-14)
