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
- **Collections and facet views** — named facet presets and left-tree tabs, shareable by URL
- **Related links** — outbound links and frontmatter `related` entries in the ToC sidebar
- **Nav ordering** — sibling order via `nav_order` from mndmap or YAML
- **Custom components** — optional consumer React components synced each build
- **Breadcrumbs** — trail above the title (`display.crumbs`)
- **Contents panel** — inline sidebar below xl (`display.contents`)
- **Theme toggle** — light / dark / system toggle in the navbar (`display.navbar`)
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

Only `title` is required. Every other key has a **named default** rather than a blank:
`none` turns a feature off, `auto` derives a value, `default` keeps the built-in behavior.
Writing `""` reads the same as the default, so nothing in the file ever needs to be empty.

The repo's own [mndsite.yaml](mndsite.yaml) is the worked example — every key set to a real
value. Full schema with defaults:

```yaml
# Required
title: My Site

# Optional — site identity
description: none            # SEO meta description added to every page
repo_url: none               # shows a GitHub icon in the navbar when set
feed_url: none               # section slug linked from the navbar feed icon
footer: default              # custom footer credits; `default` keeps the built-in

# Optional — theme presets (see docs/configuration.md for all values)
theme:
  color: default             # accent palette: default, slate, blue, emerald, rose, ...
  typeset: sans              # body font stack: sans, serif, humanist, geometric, mono
  navbar: none               # navbar background: "primary" (theme tint) or any CSS color
  footer: none               # footer background: "primary" (theme tint) or any CSS color

# Optional — navigation
nav_order: {}                # map of section slug → ordered list of page slugs

# Optional — frontmatter keys mndsite reads (frontmatter is inert unless named here).
# `none` disables a mapping; pages then fall back to their slug for the title.
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
  crumbs: [home, path]                   # breadcrumb trail above the title
  header: [date, reading_time, facets]   # metadata under the title; accepts facet names
  toc: [description, sections, related, edit]   # right sidebar (≥ xl)
  # contents: [...]                      # inline Contents panel; defaults to toc
  navbar: [theme, feed, github]          # navbar icons, left to right

# Optional — "Edit this page" targets; used ONLY when repo_url is set
edit:
  branch: main                 # branch the link targets
  path: auto                   # repo-relative content root; `auto` uses the content dir
  url: auto                    # template override; `auto` derives one from the repo_url host

# Optional — consumer extensions
components: none             # React components mirrored into components/custom/
assets: none                 # static files mirrored into public/assets/

# Paths — resolved relative to this file
content: ./docs              # source markdown directory
output: ./dist               # output directory for built site
```

### Fields and facets

mndsite reads no frontmatter key by accident. `fields` names the keys behind the built-in
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

`collections` names facet presets and `sidebar.views` lists the left-tree tabs — `tree`
filters the directory tree in place, and a facet view replaces it with pages bucketed under
that facet's values. Selection lives in the URL (`?c=`, `?view=`, `?<facet>=`), so a
filtered tree is shareable. Constraints resolve query param > collection preset > the
facet's own `default`.

### Display and disabling features

Every rendered element is listed in `display`, and omitting it is how you turn it off —
there is no second switch. Zones and their elements:

| Zone | Elements | Renders |
|------|----------|---------|
| `crumbs` | `home`, `path` | Breadcrumb trail above the title |
| `header` | `date`, `reading_time`, `facets`, or any facet name | Date, reading time, facet chips |
| `toc` | `description`, `sections`, `related`, `edit` | Right sidebar at ≥ xl |
| `contents` | same as `toc` | Inline Contents panel below the title (defaults to `toc`) |
| `navbar` | `theme`, `feed`, `github` | Navbar icons |

`display.header` also accepts facet names directly:

```yaml
display:
  header: [date, version, tags]   # version chips between the date and tag chips
```

Frontmatter stays on the emitted page for Nextra; the reader sees values only through
`fields` and `facets` mappings into `site-meta.json` and the display zones above.

### Edit links

`repo_url` is what enables them — with no `repo_url` there is no "Edit this page" link and
the `edit` block is ignored entirely. When it is set, each page links to the repo copy of
the file it was built from (`docs/features/overview.md`), using a template derived from the
host: GitHub, GitLab, and Bitbucket are known, and any other host falls back to `repo_url`
itself. `edit.path` defaults to the content directory relative to `mndsite.yaml`; set it
explicitly when the config file is not at the repo root.

### Config contract version

The release version's `MAJOR.MINOR` **is** the config contract version — `0.2.x` releases
all read the **0.2** contract. There is no `contract:` key in the file and no load-time
rejection of retired keys; pre-1.0, an unknown top-level key is simply ignored.

[CHANGELOG.md](CHANGELOG.md) is the migration record — it lists what each contract version
added, changed, and removed, including the 0.1 → 0.2 key replacements.

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
