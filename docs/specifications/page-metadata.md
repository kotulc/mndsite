---
title: Page Metadata
categories:
  - spec
---

# Page Metadata

Components render metadata sourced from [site metadata](/specifications/metadata)
(`public/site-meta.json`), not frontmatter:

- **`PageHeader`** — publish date, reading time
- **`TagList`** — the first `page_tags` chips from the page's `tags` array (see the
  [Metadata Contract](/specifications/metadata#tags))
- **`PageInfo`** — expandable Summary (`desc`) + Sections tag mosaic beside/below the title
- **`TocMenu`** — mobile/tablet Contents panel (Sections list + MetaSidebar) when the
  right ToC is hidden
- **`MetaSidebar`** — Related + Edit in the right ToC via `toc.extraContent`

`theme.config.jsx` indexes metadata by `useRouter().route` to find the current page
for `PageMeta` / SEO; `SectionContext` (`components/SectionContext.jsx`, provided in
`_app.jsx`) shares the current page and its flattened section list with PageInfo,
MetaSidebar, and TocMenu.

## Requirements

1. REQ-1: `PageHeader` renders a formatted date when the page's `published` field is present
2. REQ-2: `PageHeader` renders reading time in minutes when `metrics.reading_time` is present
3. REQ-3: A separator `·` appears only when both date and reading_time are present
4. REQ-4: `PageHeader` returns nothing when neither is provided
5. REQ-5: `TagList` renders each tag as a chip with a `chip-<group>` class for known groups (`category`, `topic`, `concept`, `entity`, `user`); unknown groups use `chip-custom`
6. REQ-6: `TagList` returns nothing when no tags are provided
7. REQ-7: `PageMeta` (date, reading time, the first `page_tags` chips from `page.tags`) renders below the page title, ahead of the rest of the page's content
8. REQ-8: `MetaSidebar` renders a combined "Related" list then an "Edit this page" link — always last; description and section tags live in `PageInfo` instead
9. REQ-9: `metrics.word_count` is computed by the ingest pipeline from page content (always present); `metrics.reading_time` is words / 200 rounded, minimum 1 minute
10. REQ-10: `MetaSidebar`'s combined "Related" list merges resolved internal `links` and intentional external http(s) links with ingest `related` pages — internal links show the page name (via `find_page`); external links show the hostname; fragment-only and unresolved internal paths are omitted
11. REQ-11: The ToC column (`.nextra-toc`) keeps Nextra's default sticky behavior — pinned near the top of the viewport with its own capped-height scrollbar — so the heading list stays fixed while the body content scrolls
12. REQ-12: `PageInfo` shows the page `desc` as Summary and a mosaic of tagged sections (each capped to `section_tags` chips); the Info and Contents toggles are mutually exclusive
13. REQ-13: Below `xl`, `TocMenu` exposes a Contents panel with a Sections list plus `MetaSidebar`; it is omitted when `toc: false`
14. REQ-14: `SectionContext` exposes the current page and a depth-first flattened list of its sections from site metadata

## Test Cases

Coverage by file, mapped to the requirements above:

- `tests/components/PageHeader.test.jsx` — date/reading-time rendering, separator, empty state (REQ-1 – REQ-4)
- `tests/components/TagList.test.jsx` — renders tags with the right chip class, empty states (REQ-5, REQ-6)
- `tests/components/MetaSidebar.test.jsx` — Related + Edit only, edit link last, links resolve to page names (or fall back to the raw href), links and related share one "Related" section, empty when neither Related nor Edit (REQ-8, REQ-10)
- `tests/components/PageInfo.test.jsx` — toggle visibility, Summary + Sections mosaic, tag cap, Escape dismiss (REQ-12)
- `tests/components/TocMenu.test.jsx` — Contents toggle, Sections list + MetaSidebar, Escape/section-click dismiss (REQ-13)
- `tests/components/SectionContext.test.jsx` — `find_page` normalization, page + flattened sections for the current route (REQ-14)
