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

This mirrors content into `pages/`, copies assets, derives renderer metadata from frontmatter,
generates navigation files, and produces a fully-built static site in `dist/`.

**5. Preview locally**

```bash
npm run preview    # serve dist/ locally
npm run dev        # development server with hot reload
```

## Local development workflow

For iterating on content without a full build each time:

```bash
npm run ingest              # mirror docs/ into pages/ (default source)
npm run dev                 # hot-reload dev server
npm run watch               # re-ingest on markdown changes (second terminal)
```

## Frontmatter fields

Add these to the top of any markdown file to control how it is displayed.
When using mndmap, missing fields such as `description` and `reading_time` may be filled upstream; mndsite renders supplied values and never overwrites them.

```yaml
---
title: My Page
date: 2026-01-15
desc: Optional summary for the PageInfo panel
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
| `title` | recommended | Falls back to the first `# heading`, then the file slug |
| `date` | optional | Shown as publish date below the title |
| `desc` / `description` | optional | Summary in the PageInfo panel |
| `categories` | optional | Rendered as category-group chips |
| `tags` | optional | Rendered as user-group chips |
| `reading_time` | optional | Minutes; shown when present and `reading_time: true` in config |
| `related` | optional | `{ title, url }` entries merged into the Related sidebar |
