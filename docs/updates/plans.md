---
title: Future Plans
date: 2026-03-08
categories:
  - roadmap
tags:
  - planning
  - phase-2
  - mndmap
complexity: 2
related:
  - title: Features
    url: /features
  - title: Components
    url: /features/components
  - title: Content Pipeline
    url: /features/content-pipeline
---

# Future Plans

Phase 1 of `mndsite` is complete. The core renderer — markdown mirroring, frontmatter metadata display, navigation, theming, mndmap handoff, and GitHub Pages deployment — is fully functional.

Phase 2 focuses on intelligence features that consume signals from the upstream **mndmap** pipeline rather than running enrichment inside mndsite.


## What's built (Phase 1)

- Markdown/MDX mirroring with any source folder structure
- `_assets/` and legacy `images/` copy with path rewriting
- Metadata display from configured `fields`, `facets`, and `display`
- Breadcrumbs, PageContents sidebar, and inline Contents panel
- Nav ordering via `nav_order` (emitted by mndmap or authored in YAML)
- Light / dark / system theme toggle in the navbar
- GitHub repo icon in the navbar, driven by `repo_url` in config
- GitHub Actions deployment workflow
- Docker image without embedding models or transformer runtime
- Cross-project mndmap destination fixture contract


## In development (Phase 2)

### Semantic search

A client-side search component that queries across all content by meaning, not just
keyword matching. The plan is to pre-compute a lightweight embedding index upstream
(in mndmap or mndmeta) and serve it as a static JSON asset — keeping the site fully static.

### Semantic theming

Derives a color palette and visual identity from content signals supplied upstream
rather than manual configuration alone.

Config hooks (reserved in `mndsite.yaml`):
```yaml
content_style: ""  # e.g. "technical", "narrative", "minimal"
theme_mood: ""     # e.g. "calm", "bold", "professional"
```

### Reduced external dependencies

The current stack leans on `nextra-theme-docs` for navigation, search, and layout.
Phase 2 will selectively replace Nextra internals with purpose-built components,
reducing the dependency footprint.


## Integrations

`mndsite` is the rendering end of the **mndmap → mndsite** pipeline:

```text
source Markdown/MDX → mndmap → destination → mndsite → dist/
```

mndmap owns organization, link rewriting, asset collection, and metadata enrichment.
mndsite owns mirroring, presentation, theme, and static export. Phase 2 intelligence
features are co-developed: mndmap generates the signals; mndsite consumes and renders them.
