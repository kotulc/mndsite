---
title: Ingest Pipeline
categories:
  - spec
version: 0.2
status: stable
---

# Ingest Pipeline

The ingest pipeline (`scripts/ingest.js`) mirrors a publication-ready source directory of Markdown/MDX into the Next.js `pages/` tree, copies assets, and writes renderer metadata to `public/site-meta.json`.

Organization and semantic enrichment are upstream concerns (**mndmap**). mndsite ingest must not regroup routes, flatten directories, run embeddings, or rewrite links semantically.

## Requirements

1. REQ-1: `.md` files are renamed to `.mdx`; `home.md` and `index.md` become `index.mdx`
2. REQ-2: `.mdx` source files are mirrored with slug preserved
3. REQ-3: Sort order: `nav_order[dir]` slug array pins listed slugs first in declared order; remaining pages sort alphabetically by slug
4. REQ-4: The `index` slug is always placed first in a directory listing
5. REQ-5: Content-root `_assets/` is copied to `public/_assets/` with path rewriting for static export
6. REQ-6: Legacy `images/` subtrees are copied to `public/images/<rel>/` with markdown path rewriting
7. REQ-7: `public/site-meta.json` is a flat `{ pages: [...] }` list derived from frontmatter and content — no generated tags or embedding scores
8. REQ-8: `extract_content()` strips frontmatter, imports, and leading H1 for utilities; imports inside code fences are preserved
9. REQ-9: Inline SVG blocks are preserved with MDX-safe brace escaping
10. REQ-10: Supplied frontmatter is kept verbatim on the emitted page; `site-meta.json` is derived separately
11. REQ-11: `_assets/` SVG images render through an `<img>` whose source resolves `BASE_PATH` at build time
12. REQ-12: Ingest warns on references the build cannot resolve — internal `.md` links and `_assets/` module imports

## Test Cases

`tests/build/ingest.test.js`

- `test_sort_alpha` — pages without nav_order sort alphabetically (REQ-3)
- `test_sort_index_always_first` — index slug precedes all others (REQ-4)
- `test_sort_array_pins_listed_slugs_first` — slug array pins listed pages in declared order (REQ-3)
- `test_extract_strips_frontmatter` — frontmatter block removed from content (REQ-8)
- `test_extract_strips_leading_h1` — leading H1 removed (REQ-8)
- `test_extract_strips_top_level_imports` — top-level imports removed (REQ-8)
- `test_site_meta_page_fields` — page record shape from frontmatter (REQ-7)
- `test_pages_preserve_frontmatter` — output MDX keeps its frontmatter block (REQ-10)

`tests/build/mndmap-fixture.test.js` — ingests the fixture into a temp root

- `preserves nested folder structure` — route tree matches mndmap destination (REQ-2)
- `copies _assets to public/_assets` — asset handoff (REQ-5)
- `preserves supplied frontmatter on emitted pages` — unknown fields survive (REQ-10)
- `emits no extension links` — upstream supplies final routes (REQ-12)
- `rewrites _assets svg to a base-path aware image` — asset image source (REQ-11)
- `derives metadata from frontmatter only` — no generated tags or scores (REQ-7)
