---
title: Content Pipeline
categories:
  - features
tags:
  - ingest
  - mndmap
  - routing
readability: 72
steps: 7
related:
  - title: Metadata Display
    url: /features/metadata
  - title: Getting Started
    url: /getting-started
  - title: Configuration
    url: /configuration
---

# Content Pipeline

The content pipeline (`scripts/ingest.js`) mirrors a publication-ready Markdown/MDX tree into the Next.js `pages/` directory and writes renderer metadata to `public/site-meta.json`. It is the **mndsite** stage of the publishing workflow — organization and enrichment happen upstream in **mndmap**.

## Pipeline workflow

```text
source Markdown/MDX
  → mndmap
      • parse and organize folders/groups
      • rewrite internal links and local assets
      • fill description, reading_time (when missing)
      • emit destination/ + mndsite.yaml (content, nav_order)
  → mndsite ingest
      • mirror routes without regrouping
      • copy _assets/ and images/
      • derive site-meta.json from frontmatter
      • generate _meta.json navigation
  → mndsite build (Next.js static export)
  → dist/
```

### mndmap owns

- Source parsing and structural identity
- File, folder, group, and section organization
- Destination layout and sibling order (`nav_order`)
- Internal link and MDX reference rewriting
- Local asset collection into `_assets/`
- Inline mndflow diagram SVG
- Future Taggly metadata enrichment

### mndsite owns

- `.md` → `.mdx` framework adaptation (no semantic content changes)
- Mirroring the route tree exactly as supplied
- Copying `_assets/` to `public/_assets/` with path rewriting
- Legacy `images/` subtree copy and path rewrite
- Renderer metadata extraction (frontmatter + link parsing)
- Navigation `_meta.json` from directory structure + `nav_order`
- Static build and export

mndsite does **not** extract keywords, run embeddings, flatten directories, score related pages, or rewrite links semantically.

## Running ingest

Directly (uses root `mndsite.yaml` or `site.config.js` defaults):

```bash
npm run ingest              # default: docs/
npm run ingest -- path/to/destination
```

Config-driven build (matches Docker and CI):

```bash
node scripts/cli.js build --config mndsite.yaml
```

## What ingest does

1. **Mirrors `.md` and `.mdx`** — any file named `home.md`, `index.md`, or `index.mdx` becomes `index.mdx` (the section landing page). All other files keep their slug. Routes match the source tree; nothing is flattened or regrouped.

2. **Copies `_assets/`** — the content-root `_assets/` tree is copied to `public/_assets/` (mndmap handoff contract). Relative `../_assets/` and `./_assets/` markdown references are rewritten to public URLs; SVG images become an `<img>` that resolves `BASE_PATH` at build time. Module imports from `_assets/` are left alone and reported as unresolvable — `public/` is outside the module graph.

3. **Copies legacy `images/`** — an `images/` folder next to markdown files is copied to `public/images/<relative-path>/`.

4. **Rewrites image refs** — `](images/photo.jpg)` becomes `](/images/rel/path/photo.jpg)` for legacy standalone content.

5. **Preserves inline SVG** — SVG blocks from upstream are kept; braces inside `<style>` are escaped for MDX safety.

6. **Preserves frontmatter** — the supplied block is kept verbatim on the output page, so Nextra and theme components can read unknown fields; renderer metadata is mirrored into `site-meta.json`.

7. **Generates `_meta.json`** — navigation labels and sibling order at every directory level:
   - `nav_order` in `mndsite.yaml` pins listed slugs first in declared order
   - Remaining siblings sort alphabetically by slug
   - Directory labels come from the index page title, then a slug-to-title fallback

8. **Writes `site-meta.json`** — flat page list derived from frontmatter and content (tags, related, links, word count, sections). No local tagging or embedding step.

## Source layout rules

- The configured content root is the site route tree
- `index.md`, `index.mdx`, or `home.md` at any level → that section's landing page
- mndsite does not create redirect indexes or synthesize landing pages — mndmap emits index documents for generated folders/groups
- `_assets/` at the content root → copied to `public/_assets/`
- `images/` next to markdown → copied and path-rewritten for legacy layouts
- Internal links should already resolve in the supplied content (rewritten by mndmap when used)

## Cross-project contract

The repository includes an mndmap destination fixture at `tests/fixtures/mndmap-destination/` and contract tests in `tests/build/mndmap-fixture.test.js`. These verify route preservation, `_assets/` copying, and frontmatter-only metadata derivation.
