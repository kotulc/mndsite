---
title: Metadata Display
categories:
  - features
tags:
  - frontmatter
  - facets
  - reading-time
related:
  - title: Getting Started
    url: /getting-started
  - title: Content Pipeline
    url: /features/content-pipeline
  - title: Metadata Contract
    url: /specifications/metadata
version: 0.2
status: stable
---

# Metadata Display

Metadata is surfaced automatically on every page — no MDX imports required.
Renderer metadata lives in [site metadata](/specifications/metadata) (`public/site-meta.json`),
indexed by URL in `theme.config.jsx`. Frontmatter stays on the emitted MDX page; values
reach the UI only through configured `fields`, `facets`, and `display` lists.

**mndsite does not synthesize facet values or related links** — those come from frontmatter
(typically filled by mndmap upstream) or from outbound links parsed from page content.

## What renders where

| UI zone | Config | Source fields |
|---------|--------|---------------|
| Breadcrumbs | `display.crumbs` | Route + page names from `site-meta.json` |
| Date / reading time | `display.header` | `published`, `metrics.reading_time` |
| Facet chips | `display.header` (`facets` or facet names) | `page.facets` |
| Description | `display.toc` / `display.contents` | `desc` via `fields.description` |
| Section list | `display.toc` / `display.contents` | `page.sections` heading tree |
| Related | `display.toc` / `display.contents` | `links`, `related` |
| Edit link | `display.toc` / `display.contents` | `repo_url`, `edit`, `page.source` |

Omitting an element from its display list turns it off — there is no separate boolean switch.

## Frontmatter example

```yaml
---
title: My Post
date: 2026-01-15
desc: Optional summary for the sidebar Description block
reading_time: 4
categories: [guide]
tags: [yaml, markdown]
doc_id: mndmap-0042
related:
  - title: Configuration
    url: /configuration
---
```

Only keys named in `fields` and `facets` appear in `site-meta.json`. The default config maps
`categories` and `tags` to facet chips; add facets for `version`, `status`, or any other
dimension upstream supplies.

## Components

**`Breadcrumbs`** — linked trail above the title from `display.crumbs`.

**`PageHeader`** — formatted date and reading time when listed in `display.header`.

**`TagList`** — facet chips; each uses `chip-{facetName}` with hue from config.

**`PageContents`** — Description, sections, Related, and Edit blocks in list order. Used in
the right sidebar and the inline Contents panel.

**`ContentsToggle` / `ContentsPanel`** — below xl, opens the same sidebar body inline.

**`SiteFooter`** — copyright, build timestamp, credits.

## Metrics

Every page carries `metrics.word_count` (computed at ingest from body text).
`metrics.reading_time` is present only when supplied in frontmatter.
Fetch metadata at `${basePath}/site-meta.json`. See the [Metadata Contract](/specifications/metadata).
