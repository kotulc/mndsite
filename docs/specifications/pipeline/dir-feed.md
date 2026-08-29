---
title: Directory Feed
categories:
  - spec
version: 0.2
status: stable
---

# Directory Feed *(removed)*

The `flatten` config field and inline directory feed behavior were **removed from mndsite** as part of the mndmap/mndsite simplification.

Directory organization — including rendering a folder as a single scrolling feed — belongs upstream in **mndmap**. mndsite config files containing `flatten` are rejected at load time.

The `DirFeed` component remains in the codebase for potential future upstream integration but is not wired by the current ingest pipeline.

## Historical behavior

Previously, `flatten` in `mndsite.yaml` caused a directory to render via `<DirFeed />` with a generated `public/dir-feeds/<name>.json` file. That responsibility now lives in mndmap's organization model.

See [Content Pipeline](/features/content-pipeline) for the current ingest contract.
