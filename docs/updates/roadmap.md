---
date: 2026-03-08
---

# Roadmap

**Phase 1 — Core renderer** *(complete)*
- Next.js + Nextra docs theme
- YAML config + CLI wrapper
- Docker image, GHCR publishing
- GitHub Pages deployment
- Metadata display from supplied frontmatter
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
