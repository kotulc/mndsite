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

The theme renders these page-node fields below the title:

| Field | Source | Effect |
|-------|--------|--------|
| `date` | frontmatter `date` | Formatted date below title; enables date-based sorting |
| `reading_time` | derived | Displays as "N min read" |
| `tags.categories` | extraction | Category chips below the title |
| `tags.keywords` | extraction | Tag chips below the title |
| `desc` | extraction, opt-in (`extract_descriptions: true`) | Per-page SEO meta description |

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

**`TagList`** renders `tags.categories` and `tags.keywords` as chips.
Both arrays are optional; the component returns null when both are empty.

**`SiteFooter`** renders the page footer (copyright, build timestamp, credits).
Edit `components/SiteFooter.jsx` directly to customize the footer across all pages.

## Metrics

With [extraction](/configuration#extraction) enabled, every page and section node also
carries a `metrics` object (`polarity`, `spam`, `toxicity` — computed per section, averaged
upward) and each page gets a `related` list, all inside `public/site-meta.json`. Components
can fetch the graph at `${basePath}/site-meta.json`.
See the [Metadata Contract](/specifications/metadata) spec for the schema.

