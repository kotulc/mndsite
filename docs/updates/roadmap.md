---
date: 2026-03-08
version: 0.3
status: draft
---

# Roadmap

**Phase 1 — Core renderer** *(complete)*
- Next.js + Nextra docs theme
- YAML config + CLI wrapper
- Docker image, GHCR publishing
- GitHub Pages deployment
- Configurable `display`, `fields`, and `facets`
- Breadcrumbs, sidebar Contents panel, and edit links
- mndmap destination fixture contract
- Nav ordering via `nav_order`
- Removed local semantic enrichment (tags, embeddings, flatten)

**Phase 2 — Custom components** *(planned)*
- Semantic search integration (index from upstream pipeline)
- Semantic theming pipeline
- Reduced external dependencies

**Phase 3 — Deploy adapters** *(planned)*
- `mndsite deploy --provider vercel|cloudflare|s3`
- Credentials via environment variables; project ID via YAML

## Long-term reading experience

Treat a site as a sequence of short, self-contained posts. Long articles and
complex documents can become ordered sequences of micro-posts, each covering one
idea or task. Readers should be able to skim the feed, open a piece in context,
and follow the sequence back to the full document when they need it.

The first step is a homepage feed with one card per published page. Next, explore
how authors can define the boundaries and order of individual pieces while
keeping stable links to the original documents. The site tree remains the way to
navigate by topic, and RSS continues to serve dated updates.
