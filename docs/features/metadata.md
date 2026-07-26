---
title: Metadata Display
categories:
  - features
tags:
  - frontmatter
  - tags
  - reading-time
readability: 76
fields: 5
components: 5
related:
  - title: Getting Started
    url: /getting-started
  - title: Content Pipeline
    url: /features/content-pipeline
---

# Metadata Display

Metadata is surfaced automatically on every page — no MDX imports required.
All metadata lives in the generated [site graph](/specifications/metadata)
(`public/site-meta.json`), which `theme.config.jsx` indexes by page url. Source
frontmatter is optional input: when present it fills node fields and is stripped from the
output page; pages without it get a generated title, and the
[extraction step](/configuration#extraction) fills the remaining fields from content.

## Displayed fields

The theme renders these page-node fields below the title, in the expandable **Page
intelligence** panel, and in the right-hand ToC (Related / Edit). Sections don't render
anything inline — tagged sections appear together in the PageInfo mosaic:

| Field | Source | Effect |
|-------|--------|--------|
| `published` | frontmatter `date` | Formatted date below the title; enables date-based sorting |
| `metrics.reading_time` | derived | Displays as "N min read" |
| `page_tags` | extraction | A page's top `page_tags`-count (default 5) most relevant tags as chips below the title; the same limit caps each section's chips in the PageInfo panel |
| `desc` | extraction, opt-in (`extract_descriptions`, default on) | SEO meta description, and the Summary block in the PageInfo panel |
| `tags` (per section) | extraction | Non-keyword groups for each tagged section in the PageInfo mosaic (keywords/metrics are not shown in the UI for now) |
| `links`, `related` | derived / extraction | Combined into a single "Related" list in the ToC sidebar (and in the mobile Contents panel) — internal links show the linked page's name, not its path |

Frontmatter that steers structure and identity:

```yaml
---
title: My Post      # page name (else the first heading, else the slug)
date: 2026-01-15    # publish date
---
```

## Components

**`PageHeader`** renders the formatted date and reading time on a single line,
separated by a center dot. Returns null when neither field is present.

**`TagList`** renders every populated tag group except `keywords` as chips. The
standard groups (`categories`/`topics`/`concepts`/`entities`) each get their own named
chip color; any other configured `extract_concepts` group falls back to a shared
`chip-custom` style. Returns null when no group has terms. Used below the title (the
page's curated `page_tags`) and inside `PageInfo` (each section's capped tags).

**`PageInfo`** (`PageInfoToggle` + `PageInfoPanel`) — an Info button beside the page
title expands an inline panel with the page **Summary** (`desc`) and a **Sections**
mosaic of tagged headings (each section name links to its in-page anchor). Keywords and
metrics are intentionally omitted for now. Info and Contents are mutually exclusive.

**`TocMenu`** (`TocMenuToggle` + `TocMenuPanel`) — below the `xl` breakpoint Nextra hides
the right ToC; a Contents button expands an inline **Page Contents** panel with a
Sections list plus the same `MetaSidebar` (Related / Edit). Disabled when `toc: false`.

**`MetaSidebar`** renders in the right ToC column via `toc.extraContent` (and inside the
mobile Contents panel): a combined **Related** list (the page's own `links` — resolved
to the linked page's name via the site graph, falling back to the raw href for external
links — followed by taggly's `related` pages), then **Edit this page** — always last,
since `theme.config.jsx` disables Nextra's built-in edit link. Description and section
tags live in PageInfo instead. Nextra pins the ToC column sticky near the top of the
viewport with its own capped-height scrollbar.

**`SiteFooter`** renders the page footer (copyright, build timestamp, credits).
Edit `components/SiteFooter.jsx` directly to customize the footer across all pages.

## Metrics

Every page carries a `metrics` object with `word_count` and `reading_time`, always
present regardless of extraction. With [extraction](/configuration#extraction) enabled,
`polarity`, `spam`, and `toxicity` are added to that same object (computed per section,
averaged upward) for both pages and sections, and each page gets a `related` list — all
inside `public/site-meta.json`. Components can fetch the graph at
`${basePath}/site-meta.json`. See the [Metadata Contract](/specifications/metadata) spec
for the schema.
