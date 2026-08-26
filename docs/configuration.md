---
title: Configuration
categories:
  - reference
tags:
  - yaml-config
  - github-pages
  - env-vars
readability: 78
fields: 14
related:
  - title: Getting Started
    url: /getting-started
  - title: Deployment
    url: /features/deployment
---

# Configuration

All site-level settings live in `mndsite.yaml` at your project root.
The CLI reads this file at build time and generates the internal `site.config.js`
consumed by Next.js and Nextra.

## Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | *(required)* | Site name — shown in the logo, footer, and page titles |
| `description` | string | `""` | SEO meta description added to every page's `<head>` |
| `repo_url` | string | `""` | GitHub repo link shown as an icon in the header; leave empty to hide |
| `feed_url` | string | `""` | Slug of the section used as the per-page continuation feed |
| `footer` | string | `""` | Custom footer credits text; empty keeps "Powered by mndsite and Nextra" |
| `theme_toggle` | string | `"navbar"` | Where the light/dark toggle appears: `"navbar"` or `"sidebar"` |
| `toc` | boolean | `true` | Right sidebar: "On This Page" section navigation |
| `reading_time` | boolean | `true` | Show estimated reading time in page headers and feeds |
| `meta.max_keywords` | integer | `32` | Max tag terms stored per page/section after ingest |
| `meta.page_tags` | integer | `5` | Max chips shown below the page title |
| `meta.section_tags` | integer | `8` | Max chips shown per section in the PageInfo mosaic |
| `meta.related_links` | integer | `3` | Related pages attached per page via embedding similarity |
| `meta.min_relevance` | number | `0.2` | Drop auto tags whose title-relevance score is below this (0–1); user/FM tags are kept |
| `theme.color` | string | `"default"` | Named accent palette — see [Theme](#theme) below |
| `theme.typeset` | string | `"sans"` | Named body font stack — see [Theme](#theme) below |
| `theme.navbar` | string | `""` | Navbar background: `"primary"` (theme tint) or any CSS color |
| `theme.footer` | string | `""` | Footer background: `"primary"` (theme tint) or any CSS color |
| `flatten` | list | `[]` | Section slugs rendered as inline feeds rather than individual pages |
| `nav_order` | object | `{}` | Explicit nav ordering per directory — see below |
| `content` | path | `./docs` | Source markdown directory (resolved relative to this file) |
| `output` | path | `./dist` | Output directory for the built site (resolved relative to this file) |
| `components` | path | `""` | Optional directory of consumer React components, mirrored into `components/custom/` each build — content MDX can import them, e.g. `import Widget from '../components/custom/Widget'` |
| `assets` | path | `""` | Optional directory of consumer static files (JSON data, etc.), mirrored into `public/assets/` each build — pages can fetch them at `${basePath}/assets/<file>` |

## Example

```yaml
title: My Site
description: What my site is about
repo_url: https://github.com/myuser/my-repo
feed_url: updates
theme:
  color: emerald
  typeset: serif
content: ./docs
output: ./dist
```

## Theme

The `theme` block styles the whole site from two named presets — no CSS required.

**`theme.color`** sets the accent palette used for links, active nav items, chips, and
buttons, in both light and dark mode. Available palettes:

`default` · `slate` · `gray` · `blue` · `indigo` · `violet` · `rose` · `orange` ·
`amber` · `emerald` · `teal` · `cyan`

`default` is Nextra's stock blue. Palette hues follow the standard Tailwind colors.
Warm palettes (`amber`, `orange`) have lower link contrast on white — they suit
accent-light pages better than link-heavy ones.

**`theme.typeset`** sets the body font from a curated system-font stack — zero network
requests, no layout shift:

| Typeset | Style |
|---------|-------|
| `sans` | System UI sans (Nextra default) |
| `serif` | Charter / Sitka / Cambria / Georgia |
| `humanist` | Seravek / Ubuntu / Calibri |
| `geometric` | Avenir / Montserrat / Corbel |
| `mono` | System monospace |

Code blocks always render monospace regardless of typeset. Unknown `color` or
`typeset` names fail the build with the list of valid values.

**`theme.navbar`** and **`theme.footer`** override the navbar and footer backgrounds.
Set `"primary"` for a soft tint derived from `theme.color` (adapts to dark mode), or any
CSS color (e.g. `"#1e293b"`, `"hsl(215 20% 95%)"`) applied as-is in both modes:

```yaml
theme:
  color: emerald
  navbar: primary
  footer: "hsl(161 30% 96%)"
```

Leave empty to keep Nextra's default white/dark backgrounds.

## Tagging

During ingest, mndsite always runs local keyword extraction and embedding-based tagging.
Output lands in `public/site-meta.json` — a flat list of pages, not frontmatter. Tags use
fixed groups (`category`, `topic`, `concept`, `entity`, `user`); frontmatter `tags` and
`categories` merge into `user` (still scored). The UI shows the first `page_tags` chips
from each page's merged tag list, and up to `section_tags` chips per section in PageInfo.

Embeddings use **Xenova/all-MiniLM-L6-v2** vendored at `models/Xenova/all-MiniLM-L6-v2/`.
Ingest loads from disk only — no Hugging Face download. After all pages are tagged,
`fill_related` scores pairwise page similarity and writes `related` (`{ name, url, score }`).

Optional page summary: set `desc` or `description` in frontmatter — PageInfo shows it when present.

```yaml
meta:
  max_keywords: 32       # tag pool stored per page/section
  page_tags: 5           # chips below title
  section_tags: 8        # chips per section in PageInfo
  related_links: 3       # related pages per page (skips urls already in links)
  min_relevance: 0.2     # drop auto tags below this title-relevance score
```

See the [Metadata Contract](/specifications/metadata) spec for the full schema. Hashing,
incremental graph enrichment, and external NLP live in the sibling **mndmeta** project.

## Nav ordering

By default the pipeline sorts pages newest-first by `date`, or alphabetically.
Use `nav_order` to define explicit ordering at any directory level:

```yaml
nav_order:
  "": [getting-started, configuration, features]
  features: [content-pipeline, metadata, deployment]
```

The key `""` refers to the source root. Other keys are subdirectory slugs.
Folders and pages can be mixed. Slugs not listed append alphabetically after
the explicit entries; dated pages sort newest-first.

## BASE_PATH environment variable

If your site is served from a subpath (e.g. `username.github.io/repo-name`), pass
`BASE_PATH` as an environment variable at build time — do not put it in `mndsite.yaml`:

```bash
BASE_PATH=/repo-name node scripts/cli.js build --config mndsite.yaml
# or via Docker:
docker run --rm -e BASE_PATH=/repo-name -v $(pwd):/workspace ghcr.io/kotulc/mndsite ...
```

For GitHub Pages, the deploy workflow reads `BASE_PATH` from a repository Actions variable
(Settings → Secrets and variables → Actions → Variables → `BASE_PATH`).
Local builds and previews need no base path — `npx serve dist` works as-is.

## GitHub Actions variables

The deployment workflow reads these optional repository variables.
Set them under **Settings → Secrets and variables → Actions → Variables**.

| Variable | Default | Description |
|----------|---------|-------------|
| `CONTENT_SOURCE` | `docs` | Path to content directory, relative to repo root |
| `BASE_PATH` | _(empty)_ | Subpath prefix for project pages repos (e.g. `/mndsite`) |

## CLI overrides

The `--content` and `--output` flags override the corresponding YAML fields at runtime:

```bash
node scripts/cli.js build --config mndsite.yaml \
  --content /path/to/content \
  --output /path/to/output
```
