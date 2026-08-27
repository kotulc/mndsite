---
title: Overview
categories:
  - features
tags:
  - overview
topics: 4
related:
  - title: Content Pipeline
    url: /features/content-pipeline
  - title: Metadata Display
    url: /features/metadata
  - title: Styling
    url: /features/styling
  - title: Deployment
    url: /features/deployment
---

# Features

mndsite is a thin, opinionated layer on top of Next.js and Nextra. It renders publication-ready content supplied by **mndmap** (or a standalone markdown tree) into a static site. Each feature is either automatic mirroring behavior or driven by frontmatter and `mndsite.yaml`.

```text
mndmap  →  organize, enrich, rewrite  →  destination/
mndsite →  mirror, present, export    →  dist/
```

- [Content Pipeline](content-pipeline) — mndmap/mndsite split and ingest behavior
- [Metadata Display](metadata) — dates, reading time, tags, and categories from frontmatter
- [Styling](styling) — custom CSS, Nextra theme variables, layout structure
- [Deployment](deployment) — GitHub Actions, Docker, and CI/CD workflows
