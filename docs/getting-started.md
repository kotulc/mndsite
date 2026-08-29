---
title: Getting Started
categories:
  - guide
tags:
  - setup
  - npm
  - configuration
readability: 85
complexity: 2
related:
  - title: Configuration
    url: /configuration
  - title: Content Pipeline
    url: /features/content-pipeline
version: 0.2
status: stable
---

# Getting Started

## Prerequisites

- Node.js 18 or later
- npm (bundled with Node.js)

## Recommended workflow (mndmap + mndsite)

For multi-folder sites with organization, link rewriting, and generated metadata, run **mndmap** first, then point mndsite at the destination:

```text
your-source/  ──mndmap build──▶  destination/  ──mndsite build──▶  dist/
                                      ├── docs/…
                                      ├── _assets/
                                      └── mndsite.yaml
```

mndmap emits a publication-ready tree plus an `mndsite.yaml` with `content`, `nav_order`, and preserved theme/deployment fields. mndsite mirrors that tree without reorganizing it.

```bash
# upstream (in your mndmap workspace)
mndmap build --config mndmap.yaml

# renderer (mount or copy the destination)
node scripts/cli.js build --config /path/to/destination/mndsite.yaml
```

See the [Content Pipeline](/features/content-pipeline) for the full responsibility split.

## Standalone workflow (mndsite only)

When content is already organized and frontmatter is complete, mndsite can build directly from a markdown tree.

**1. Install dependencies**

```bash
npm install
```

**2. Configure the site**

Create an `mndsite.yaml` in your project root (or copy the included one):

```yaml
title: My Site
repo_url: https://github.com/username/repo-name
content: ./docs
output: ./dist
nav_order:
  "": [about, getting-started]
fields:
  title: title
  description: [description, desc]
  date: date
facets:
  categories: { field: categories, label: Category, color: blue }
  tags:       { field: tags,       label: Tag,      color: violet }
display:
  header: [date, reading_time, facets]
  toc: [description, sections, related, edit]
```

If deploying to a subpath (e.g. GitHub Pages project repo), set `BASE_PATH=/repo-name`
as an environment variable at build time — see [Configuration](/configuration).

**3. Organize your content**

Place markdown or MDX files in any directory. Subdirectories become URL segments.
An `index.md` or `index.mdx` at any level becomes that section's landing page.
mndsite does not flatten, regroup, or rename supplied paths.

```
docs/
├── index.md
├── about.md
├── images/
├── _assets/          # optional static assets (mndmap handoff)
└── posts/
    └── 2026/
        └── my-first-post.md
```

**4. Build the site**

```bash
node scripts/cli.js build --config mndsite.yaml
```

This mirrors content into `pages/` (preserving frontmatter), copies assets, derives
`site-meta.json` from configured `fields` and `facets`, generates navigation files,
and produces a fully-built static site in `dist/`.

**5. Preview locally**

```bash
npm run preview    # serve dist/ locally
npm run dev        # development server with hot reload
```

## Local development workflow

For iterating on content without a full build each time:

```bash
npm run ingest              # mirror docs/ into pages/ and regenerate site.config.js
npm run dev                 # hot-reload dev server
npm run watch               # re-ingest on markdown changes (second terminal)
```

## Frontmatter fields

Frontmatter is inert unless named in `fields` or `facets`. When using mndmap, missing
fields such as `description` and `reading_time` may be filled upstream; mndsite renders
supplied values and never overwrites them.

```yaml
---
title: My Page
date: 2026-01-15
desc: Optional summary for the sidebar Description block
categories:
  - tutorial
tags:
  - markdown
reading_time: 4
related:
  - title: Configuration
    url: /configuration
---
```

| Field | Required | Notes |
|-------|----------|-------|
| `title` | recommended | From `fields.title`; else filename stem (or directory name for index pages) |
| `date` | optional | Shown when `date` is listed in `display.header` |
| `desc` / `description` | optional | Shown when `description` is listed in `display.toc` |
| `categories`, `tags` | optional | Rendered when declared in `facets` and listed in `display.header` |
| `reading_time` | optional | Shown when listed in `display.header` |
| `related` | optional | `{ title, url }` entries in the Related block |
| `doc_id` | optional | Stable identity for variant grouping (default `fields.identity` key) |

Page headings are not read for titles or navigation labels — frontmatter and filenames only.
