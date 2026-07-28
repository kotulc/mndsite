---
title: Metadata Display
categories:
  - features
tags:
  - frontmatter
  - tags
  - reading-time
related:
  - title: Getting Started
    url: /getting-started
  - title: Content Pipeline
    url: /features/content-pipeline
---

# Metadata Display

Metadata is surfaced automatically on every page — no MDX imports required.
All metadata lives in the generated [site metadata](/specifications/metadata)
(`public/site-meta.json`), which `theme.config.jsx` indexes by page url. Source
frontmatter is optional input: when present it fills node fields and is stripped from the
output page; pages without it get a generated title. Ingest always runs local keyword +
embedding tagging to fill `tags`, `related`, and structural fields.

## Displayed fields

The theme renders these page fields below the title, in the expandable **Page
intelligence** panel, and in the right-hand ToC (Related / Edit). Sections don't render
anything inline — tagged sections appear together in the PageInfo mosaic:

| Field | Source | Effect |
|-------|--------|--------|
| `published` | frontmatter `date` | Formatted date below the title; enables date-based sorting |
| `metrics.reading_time` | derived | Displays as "N min read" |
| `tags` (page) | ingest | First `page_tags` chips (default 5) from the merged tag list below the title |
| `desc` | frontmatter `desc` / `description`, optional | SEO meta description and the Summary block in PageInfo when present |
| `tags` (per section) | ingest | Section tags in the PageInfo mosaic, capped to `page_tags` chips each |
| `links`, `related` | derived / ingest | Combined into a single "Related" list in the ToC sidebar (and mobile Contents panel) — internal links show the linked page's name, not its path |

Frontmatter that steers structure and identity:

```yaml
---
title: My Post      # page name (else the first heading, else the slug)
date: 2026-01-15    # publish date
desc: Optional summary for Page intelligence
tags: [yaml, extract]   # merged into group "user" during ingest
---
```

## Components

**`PageHeader`** renders the formatted date and reading time on a single line,
separated by a center dot. Returns null when neither field is present.

**`TagList`** renders tags as chips. Each tag is `{ term, group }` with groups
`category`, `topic`, `concept`, `entity`, or `user`. Returns null when empty. Used below
the title (first `page_tags` from `page.tags`) and inside `PageInfo` (each section's
capped tags).

**`PageInfo`** (`PageInfoToggle` + `PageInfoPanel`) — an Info button beside the page
title expands an inline panel with the page **Summary** (`desc`) and a **Sections**
mosaic of tagged headings (each section name links to its in-page anchor). Info and
Contents are mutually exclusive.

**`TocMenu`** (`TocMenuToggle` + `TocMenuPanel`) — below the `xl` breakpoint Nextra hides
the right ToC; a Contents button expands an inline **Page Contents** panel with a
Sections list plus the same `MetaSidebar` (Related / Edit). Disabled when `toc: false`.

**`MetaSidebar`** renders in the right ToC column via `toc.extraContent` (and inside the
mobile Contents panel): a combined **Related** list (the page's own `links` — resolved
to the linked page's name via the site metadata index, falling back to the raw href for
external links — followed by ingest `related` pages), then **Edit this page** — always
last, since `theme.config.jsx` disables Nextra's built-in edit link. Description and
section tags live in PageInfo instead. Nextra pins the ToC column sticky near the top of
the viewport with its own capped-height scrollbar.

**`SiteFooter`** renders the page footer (copyright, build timestamp, credits).
Edit `components/SiteFooter.jsx` directly to customize the footer across all pages.

## Metrics

Every page carries a `metrics` object with `word_count` and `reading_time`, always
present. Ingest also writes `tags` and `related` for every page. Components can fetch
metadata at `${basePath}/site-meta.json`. See the [Metadata Contract](/specifications/metadata)
spec for the schema.
