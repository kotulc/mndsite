---
title: Site Configuration
categories:
  - spec
---

# Site Configuration

All site-level settings are authored in `mndsite.yaml`. In a mndmap workflow, mndmap emits this file at the destination root with precedence: mndmap template → workspace-root YAML → mndsite defaults.

At build time the CLI generates `site.config.js` from the YAML; both the ingest pipeline and Next.js/Nextra read from the generated file at their respective run times.

## Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Site name shown in browser tab and navbar logo |
| `description` | string | `''` | SEO meta description; per-page frontmatter overrides it |
| `repo_url` | string | `''` | GitHub repo URL; shows GitHub icon and "Edit this page" link when non-empty |
| `feed_url` | string | `''` | Section slug linked from the navbar feed icon |
| `footer` | string | `''` | Custom footer credits text |
| `theme_toggle` | `'navbar'`\|`'sidebar'` | `'navbar'` | Where the light/dark/system toggle appears |
| `toc` | boolean | `true` | Show right-side "On This Page" TOC column |
| `reading_time` | boolean | `true` | Show reading time when present in frontmatter |
| `theme` | object | see [Configuration](/configuration#theme) | Color palette, typeset, navbar/footer backgrounds |
| `nav_order` | object | `{}` | Slug array to pin specific pages first; remaining pages sort alphabetically |
| `content` / `output` | path | `./docs` / `./dist` | Source and output directories, resolved relative to the YAML file |
| `components` / `assets` | path | `''` | Consumer component and static asset directories mirrored into the build |

### Removed fields

| Field | Status |
|-------|--------|
| `meta` | Rejected — move tagging to mndmap or frontmatter |
| `flatten` | Rejected — move directory organization to mndmap |

Site sub-path deployment uses the `BASE_PATH` environment variable at build time
(handled by Next.js `basePath`), not a YAML field.

## Requirements

1. REQ-1: Generated URLs resolve correctly under a `BASE_PATH` sub-path (via Next.js router basePath)
2. REQ-2: When `repo_url` is empty, the GitHub icon is hidden from the navbar
3. REQ-3: When `theme_toggle: 'navbar'`, the toggle appears in the navbar and Nextra's built-in dark mode toggle is hidden
4. REQ-4: `nav_order[dir]` slug array pins listed slugs first; remaining pages sort alphabetically by slug
5. REQ-5: Config files containing `meta` or `flatten` fail at load time with migration guidance

## Test Cases

REQ-4 is covered by `tests/build/ingest.test.js` (sort_entries suite).

REQ-5 is covered by `tests/build/config.test.js` (removed key rejection).

REQ-2, REQ-3 are verified manually:

- Set `repo_url: ''` → GitHub icon absent from navbar
- Set `theme_toggle: 'navbar'` → toggle appears in navbar, sidebar toggle absent
