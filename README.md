# mndsite

A portable static site renderer for publication-ready Markdown and MDX — drop it into any CI/CD pipeline as a build step.

Point it at a directory of content with a YAML config, and it outputs a fully-built static website ready to deploy anywhere.


## Purpose

`mndsite` is a Next.js + Nextra-based static site renderer designed to work at the end of a markdown publishing pipeline. In the typical workflow, **mndmap** organizes source markdown, enriches frontmatter, and emits a destination directory; `mndsite` mirrors that tree, builds navigation, and produces a `dist/` folder. Publishing is left to the caller.

Raw markdown directories also work when content is already publication-ready — the same YAML config and CLI apply.

The engine is packaged as a Docker image: mount your content and config, get a static site.


## How It Works

```text
source Markdown/MDX
  → mndmap (optional — organization, metadata, assets)
  → mndsite ingest + build
  → dist/
```

1. Prepare a content directory (from mndmap or your own markdown tree)
2. Provide an `mndsite.yaml` config pointing at that content
3. Run the CLI or Docker container to ingest and build
4. A fully-built static site appears in your output directory

See [Getting Started](docs/getting-started.md) to have a site running in minutes,
or browse [Features](docs/features/overview.md) for the full capability overview.


## Features

- **Markdown → MDX** — automatic conversion; mirrors any folder structure without regrouping
- **MDX and inline SVG** — publication-ready MDX and diagrams preserved from upstream
- **`_assets/` handoff** — static assets copied to `public/_assets/` with path rewriting
- **Images** — legacy `images/` subtrees copied and path-rewritten; corrupt EXIF stripped
- **Reading time** — displayed when supplied in frontmatter
- **Facets** — tags, categories, or any declared frontmatter dimension, rendered as colored chips
- **Related links** — outbound links and frontmatter `related` entries in the ToC sidebar
- **Nav ordering** — sibling order via `nav_order` from mndmap or YAML
- **Custom components** — optional consumer React components synced each build
- **Theme toggle** — light / dark / system toggle in the navbar
- **GitHub header icon** — circular GitHub repo link, auto-shown from `repo_url`
- **YAML config** — single file drives the entire build
- **Docker** — packaged as a container for use in any CI/CD pipeline


## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (bundled with Node.js)

### Install

```bash
npm install
```

### Local Development

Configure via `mndsite.yaml` (or copy the included one), then:

```bash
npm run ingest              # mirror docs/ into pages/ (default source)
npm run dev                 # development server with hot reload
npm run watch               # re-ingest on markdown changes (second terminal)
npm run build               # production build → dist/
npm run preview             # serve dist/ locally
npm test                    # run all tests
```

### CLI Usage

For config-driven builds (required for Docker and CI), use the CLI:

```bash
node scripts/cli.js build --config mndsite.yaml
```

| Flag | Description |
|---|---|
| `--config <path>` | **(required)** Path to an `mndsite.yaml` config file |
| `--content <path>` | Override the content directory from YAML |
| `--output <path>` | Override the output directory from YAML |

The CLI reads the YAML, ingests content, generates `site.config.js`, runs Next.js build,
and exits with the build's exit code.


## mndsite.yaml Reference

Full schema with defaults:

```yaml
# Required
title: My Site

# Optional — site identity
description: ""              # SEO meta description added to every page
repo_url: ""                 # shows a GitHub icon in the navbar when set
feed_url: ""                 # slug of the section used as the per-page feed
footer: ""                   # custom footer credits; empty keeps the default

# Optional — layout
theme_toggle: navbar         # "navbar" or "sidebar"

# Optional — theme presets (see docs/configuration.md for all values)
theme:
  color: default             # accent palette: default, slate, blue, emerald, rose, ...
  typeset: sans              # body font stack: sans, serif, humanist, geometric, mono
  navbar: ""                 # navbar background: "primary" (theme tint) or any CSS color
  footer: ""                 # footer background: "primary" (theme tint) or any CSS color

# Optional — navigation
nav_order: {}                # map of section slug → ordered list of page slugs

# Optional — frontmatter keys mdsite reads (frontmatter is inert unless named here)
fields:
  title: title
  description: [description, desc]
  date: date
  reading_time: reading_time
  related: related
  identity: doc_id           # stable id grouping variants of one document (from mndmap)

# Optional — content dimensions rendered as chips and filters
facets:
  categories: { field: categories, label: Category, color: blue, ui: chips, sort: alpha }
  tags:       { field: tags,       label: Tag,      color: violet, ui: chips, sort: alpha }

# Optional — named facet presets; "default" names the active one, or "all"
collections:
  default: all

# Optional — left tree views: "tree" is the directory hierarchy, others name a facet
sidebar:
  views: [tree]

# Optional — rendered elements, in display order; omit one to turn it off
display:
  title_row: [info, contents]            # actions beside the page title
  header: [date, reading_time, facets]   # metadata under the title; accepts facet names
  info: [description]                    # Info panel contents
  toc: [sections, related, edit]         # right sidebar, top to bottom
  navbar: [theme, feed, github]          # navbar icons, left to right
limits:
  header_chips: 8              # chips shown under the title
  related: 6                   # entries in the Related list

# Optional — consumer extensions
components: ""               # React components mirrored into components/custom/
assets: ""                   # static files mirrored into public/assets/

# Paths — resolved relative to this file
content: ./docs              # source markdown directory
output: ./dist               # output directory for built site
```

### Fields and facets

mdsite reads no frontmatter key by accident. `fields` names the keys behind the built-in
renderer metadata, and `facets` declares every content dimension — tags, categories,
version, status, applicability, anything else upstream stamps into frontmatter.

| Facet key | Default | Purpose |
|---|---|---|
| `field` | *(required)* | Frontmatter key to read |
| `label` | facet name, title-cased | Chip tooltip and view label |
| `color` | next palette entry | `blue`, `violet`, `amber`, `rose`, `green`, `teal`, or a hue `0-359` |
| `values` | any value allowed | Allowed values; anything else is dropped |
| `sort` | `alpha` | `alpha`, `semver`, `date`, `listed` |
| `default` | all values | Values active when no filter is applied; `latest` for ordered facets |
| `ui` | `chips` | `chips`, `select`, `badge`, `none` |

Chip colors are generated per facet from its hue, in both light and dark themes, so a
user-defined facet gets a coherent chip without any CSS. A value whose facet is not
declared falls back to the neutral `chip-custom` style.

Rules worth knowing:

- Facet values come from frontmatter only — never from paths, and never generated.
- A page missing a facet's field simply has no value for it, and matches any filter on it.
- Filtering scopes navigation and listings; every page keeps its route regardless.
- Values not listed in a facet's `values` are dropped, so the config stays authoritative.

`collections` and `sidebar.views` are read and validated today; the filtering UI that
consumes them is still in progress.

### Display and disabling features

Every rendered element is listed in `display`, and omitting it is how you turn it off —
no feature has a second switch. `display.header` also accepts facet names, so any
frontmatter field declared as a facet can be placed exactly where you want it:

```yaml
display:
  header: [date, version, tags]   # version value between the date and the tag chips
```

Frontmatter itself never renders. It stays on the emitted page as metadata for Nextra and
theme components; it reaches the reader only through `fields` and `facets` mappings.

### Removed configuration keys

`meta` and `flatten` are no longer supported. Move tagging, related-link scoring, and directory organization upstream to **mndmap** or into frontmatter. Config files that still contain these keys fail at load time with migration guidance.

### BASE_PATH environment variable

If your site is served from a subpath (e.g. `https://username.github.io/repo-name`),
set the `BASE_PATH` environment variable at build time — do not add it to `mndsite.yaml`.

```bash
BASE_PATH=/repo-name node scripts/cli.js build --config mndsite.yaml
# or via Docker:
docker run --rm -e BASE_PATH=/repo-name -v $(pwd):/workspace ghcr.io/kotulc/mndsite build --config /workspace/mndsite.yaml
```

For GitHub Pages the deploy workflow reads `BASE_PATH` from a repository Actions variable
(Settings → Secrets and variables → Actions → Variables). Local builds and previews need
no base path — `npx serve dist` works as-is.


## Docker

### Build the image

```bash
docker build -t mndsite .
```

### Run a build

```bash
# Linux / macOS
docker run --rm \
  -v $(pwd):/workspace \
  mndsite build --config /workspace/mndsite.yaml

# Windows (PowerShell)
docker run --rm `
  -v ${PWD}:/workspace `
  mndsite build --config /workspace/mndsite.yaml
```

The container mounts your workspace, reads `mndsite.yaml`, and writes the built site to the
`output` path defined in the YAML (default: `./dist` relative to the YAML file).

### Using from another project

Pull the published image from GHCR and add a build step to your CI:

```yaml
- name: Build docs
  run: |
    docker run --rm \
      -v ${{ github.workspace }}:/workspace \
      ghcr.io/kotulc/mndsite:latest \
      build --config /workspace/mndsite.yaml
```

Ship an `mndsite.yaml` in your repo root pointing at your docs folder:

```yaml
title: My Project
repo_url: https://github.com/username/my-project
content: ./docs
output: ./dist
```

If the site is served from a subpath, pass `BASE_PATH` as an environment variable at
build time (see above) — it does not belong in `mndsite.yaml`.

Then add your own publish step (GitHub Pages, Vercel, S3, etc.) after the build step.


## Publishing to GitHub Pages

The included workflow (`.github/workflows/deploy.yml`) builds and deploys automatically
on every push to `main`. One-time setup:

**1. Enable GitHub Pages**
- Repository **Settings → Pages → Build and deployment**
- Set **Source** to `GitHub Actions` → **Save**

**2. Set BASE_PATH** *(project pages repos only)*
- **Settings → Secrets and variables → Actions → Variables → New repository variable**
- Name: `BASE_PATH`, Value: `/repo-name` (e.g. `/mndsite`)

**3. Push to main**

```bash
git push
```

Go to the **Actions** tab to watch progress. Your site will be live at:
```
https://<username>.github.io/<repo-name>/
```


## Publishing the Docker Image

Tag a release to publish the image to GHCR automatically:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The publish workflow (`.github/workflows/publish-image.yml`) builds and pushes:
- `ghcr.io/kotulc/mndsite:latest`
- `ghcr.io/kotulc/mndsite:v1.0.0`
