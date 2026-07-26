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

The theme renders these page-node fields below the title and in the right-hand ToC
sidebar. Sections don't render anything inline — all section-level metadata lives in
the sidebar, scroll-driven:

| Field | Source | Effect |
|-------|--------|--------|
| `published` | frontmatter `date` | Formatted date below the title; enables date-based sorting |
| `metrics.reading_time` | derived | Displays as "N min read" |
| `page_tags` | extraction | A page's top `page_tags`-count (default 5) most relevant tags, chips below the title; the current section's full `tags` (or the page's `page_tags`) in the ToC sidebar |
| `desc` | extraction, opt-in (`extract_descriptions`, default on) | SEO meta description, and the first block in the ToC sidebar |
| `tags.keywords`, `metrics` | extraction | Currently-viewed section's keywords + metrics in the ToC sidebar (scroll-driven) |
| `links`, `related` | derived / extraction | Combined into a single "Related" list in the ToC sidebar — internal links show the linked page's name, not its path |

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
`chip-custom` style. Returns null when no group has terms. It's used both below the
title (the page's curated `page_tags`) and in `MetaSidebar` (the active section's full
tags, or the page's `page_tags` when no section is in view).

**`SectionMarker`** is injected automatically by the ingest pipeline right after every
`##`/`###` heading (`<SectionMarker i={N}/>`, no import needed — it's registered as a
global MDX component in `theme.config.jsx`). It renders nothing visible — sections used
to show their own inline tag chips, but that looked too busy, so it now only reports
its scroll position (via `IntersectionObserver`) so the ToC sidebar can track and
display the current section's metadata instead.

**`MetaSidebar`** renders in the right ToC column, below Nextra's own "On This Page"
heading list, via `toc.extraContent`, in order: `desc`, tags (the active section's own
`TagList`, or the page's curated `page_tags` when no section is in view), its
`keywords` + `metrics`, then a combined "Related" list (the page's own `links` —
resolved to the linked page's name via the site graph, falling back to the raw href for
external links — followed by taggly's `related` pages), then "Edit this page" — always
last, since `theme.config.jsx` disables Nextra's built-in edit link (which would
otherwise render before `extraContent`) in favor of rendering it here. "Current
section" is tracked through a small context (`components/SectionContext.jsx`, provided
in `_app.jsx`) shared between the content area and the ToC column; it resets
synchronously on page navigation (never pairing a stale section index with the new
page) and force-activates the last section once the page has been scrolled as far as it
goes, since the last section's own marker often can't reach the scrollspy trigger band.
Nextra pins the whole ToC column sticky near the top of the viewport with its own
capped-height scrollbar, so the heading list and Related links stay fixed while the
body scrolls.

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

