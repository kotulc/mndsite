---
title: Navtree Naming
categories:
  - spec
---

# Navtree Naming

Rules for how each entry in the site's navigation tree is labelled. Labels are
written into each directory's `_meta.json` by the ingest pipeline from supplied page titles and directory index pages.

In a mndmap workflow, folder labels typically come from generated landing-page titles upstream; mndsite honors the mirrored index documents without synthesizing new ones.

## Requirements

1. REQ-1: A page's navtree label is its `title` frontmatter value when present; otherwise `slug_to_title(filename_stem)` (e.g., `my-page.md` → "My Page"). Page headings are never read — frontmatter is the only override
2. REQ-2: `home.md` and `index.md` both produce `index.mdx`; without a frontmatter title they take the name of the directory they land, and the site title at the content root
3. REQ-3: A directory's navtree label is its index page's title; when no index page exists it falls back to `slug_to_title(directory_name)` — the same value REQ-2 gives an untitled index page
4. REQ-4: A directory with no index document gets a generated redirect `index.mdx` pointing at its first sorted page, so every directory route resolves without the author creating a landing page
5. REQ-5: A generated index is marked `display: hidden` in `_meta.json`, so it does not appear as a second nav entry beside the page it redirects to

## Test Cases

`tests/build/ingest.test.js`

- `test_nav_label_from_frontmatter_title` — frontmatter `title` is used as navtree label (REQ-1)
- `test_nav_label_fallback_slug_to_title` — label derived from filename stem when no frontmatter title (REQ-1)
