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
  - title: Metadata Contract
    url: /specifications/metadata
---

# Metadata Display

Metadata is surfaced automatically on every page — no MDX imports required.
All renderer metadata lives in the generated [site metadata](/specifications/metadata)
(`public/site-meta.json`), which `theme.config.jsx` indexes by page URL.

Source frontmatter is optional input. When present it fills node fields and is stripped from the output page; pages without it get a title from the first heading or the file slug. **mndsite does not synthesize tags, categories, or related links** — those come from frontmatter (typically filled by mndmap upstream) or from outbound links parsed from page content.

## Displayed fields

The theme renders these page fields below the title, in the expandable **Page intelligence** panel, and in the right-hand ToC (Related / Edit):

| Field | Source | Effect |
|-------|--------|--------|
| `published` | frontmatter `date` | Formatted date below the title |
| `metrics.reading_time` | frontmatter `reading_time` | Displays as "N min read" when present |
| `tags` (page) | frontmatter `tags` + `categories` | Chip pills below the title |
| `desc` | frontmatter `desc` / `description` | Summary block in PageInfo when present |
| `links` | parsed from markdown links in body | Resolved internal links in Related sidebar |
| `related` | frontmatter `related` | Explicit related entries in Related sidebar |

Section records in `site-meta.json` carry heading structure for PageInfo navigation but **no generated section tags**.

Frontmatter that steers structure and identity:

```yaml
---
title: My Post
date: 2026-01-15
desc: Optional summary for Page intelligence
reading_time: 4
tags: [yaml, markdown]
categories: [guide]
related:
  - title: Configuration
    url: /configuration
---
```

When using mndmap, missing `desc` and `reading_time` may be filled upstream from page content. mndsite renders supplied values and does not overwrite manual frontmatter.

## Components

**`PageHeader`** renders the formatted date and reading time on a single line,
separated by a center dot. Returns null when neither field is present.

**`TagList`** renders tags as chips. Each tag is `{ term, group }` with groups
`category`, `topic`, `concept`, `entity`, or `user`. Frontmatter `tags` use group `user`;
`categories` use group `category`. Returns null when empty.

**`PageInfo`** — an Info button beside the page title expands an inline panel with the page **Summary** (`desc`) and a **Sections** mosaic of in-page headings (each section name links to its anchor). Info and Contents toggles are mutually exclusive.

**`TocMenu`** — below the `xl` breakpoint Nextra hides the right ToC; a Contents button expands an inline **Page Contents** panel with a Sections list plus `MetaSidebar`. Disabled when `toc: false`.

**`MetaSidebar`** — a combined **Related** list (resolved internal `links`, intentional external http(s) links, then frontmatter `related` entries), then **Edit this page** when `repo_url` is set.

**`SiteFooter`** renders the page footer (copyright, build timestamp, credits).

## Metrics

Every page carries `metrics.word_count` (computed at ingest from body text).
`metrics.reading_time` is present only when supplied in frontmatter.
Components can fetch metadata at `${basePath}/site-meta.json`. See the [Metadata Contract](/specifications/metadata) spec for the schema.
