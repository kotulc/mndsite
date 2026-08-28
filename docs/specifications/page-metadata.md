---
title: Page Metadata
categories:
  - spec
---

# Page Metadata

Components render metadata from [site metadata](/specifications/metadata)
(`public/site-meta.json`), driven by `display` lists in `mndsite.yaml`:

- **`Breadcrumbs`** — `display.crumbs`
- **`PageHeader`** + **`TagList`** — `display.header`
- **`PageContents`** — `display.toc` (sidebar) and `display.contents` (inline panel)
- **`ContentsToggle` / `ContentsPanel`** — opens `PageContents` below xl

`theme.config.jsx` indexes metadata by route for SEO and `PageMeta`; `SectionContext`
(`_app.jsx`) shares the current page and its flattened section list with the components above.

## Requirements

1. REQ-1: `PageHeader` renders a formatted date when `date` is listed in `display.header` and `published` is present
2. REQ-2: `PageHeader` renders reading time when `reading_time` is listed in `display.header` and `metrics.reading_time` is present
3. REQ-3: A separator `·` appears only when both date and reading_time render
4. REQ-4: `PageHeader` returns nothing when neither field is configured or present
5. REQ-5: `TagList` renders each chip with class `chip-{facetName}` for declared facets; undeclared groups use `chip-custom`
6. REQ-6: `TagList` returns nothing when no chips are supplied
7. REQ-7: `PageMeta` (header line + chips) renders below the custom h1, before page content
8. REQ-8: `PageContents` renders listed blocks in order — Description, sections, Related, Edit — skipping empty blocks
9. REQ-9: `metrics.word_count` is always computed at ingest; `metrics.reading_time` only when present in frontmatter
10. REQ-10: Related merges resolved internal `links`, external http(s) links, and frontmatter `related`
11. REQ-11: Edit link renders last when `edit` is listed; requires `repo_url` and uses `page.source` + `edit` template
12. REQ-12: `ContentsToggle` hides when `contents_items` is empty; `ContentsPanel` dismisses on Escape and route change
13. REQ-13: `Breadcrumbs` follows `display.crumbs`; empty list renders nothing
14. REQ-14: `SectionContext` exposes the current page and a depth-first flattened section list

## Test Cases

- `tests/components/PageHeader.test.jsx` — REQ-1 – REQ-4
- `tests/components/TagList.test.jsx` — REQ-5, REQ-6
- `tests/components/PageContents.test.jsx` — REQ-8 – REQ-11
- `tests/components/ContentsMenu.test.jsx` — REQ-12
- `tests/components/Breadcrumbs.test.jsx` — REQ-13
- `tests/components/SectionContext.test.jsx` — REQ-14
