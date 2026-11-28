# MndSite

A portable static site renderer for publication-ready Markdown and MDX — drop it into any CI/CD pipeline as a build step.

Point it at a directory of content with a YAML config, and it outputs a fully-built static website ready to deploy anywhere.


## Purpose

`mndsite` is a Next.js + Nextra-based static site renderer designed to work at the end of a markdown publishing pipeline. In the typical workflow, **mndmap** organizes source markdown, enriches frontmatter, and emits a destination directory; `mndsite` mirrors that tree, builds navigation, and produces a `dist/` folder. Publishing is left to the caller.

[Trendly](https://github.com/kotulc/trendly) opens the same repository to preview posts, manage draft publication, and read RSS subscriptions. Editors and agents work on the Markdown files. mndsite builds the public pages, expandable feed, and RSS from those files and `mndsite.yaml`.

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
- **Pages** — browse and filter published pages with shareable URLs
- **Related links** — outbound links and frontmatter `related` entries in the ToC sidebar
- **Nav ordering** — sibling order via `nav_order` from mndmap or YAML
- **Custom components** — optional consumer React components synced each build
- **Breadcrumbs** — trail above the title (`display.crumbs`)
- **Right sidebar** description, sections, related pages, related links, and recent posts (`display.toc`)
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
# feed:                       # optional public feed and RSS selection
#   path: /feed/
#   include: [posts/]
rss: false                   # opt in with { site_url: https://example.org/site/ }
footer: default              # custom footer credits; `default` keeps the built-in

# Optional — theme presets (see docs/configuration.md for all values)
theme:
  color: default             # accent palette: default, slate, blue, emerald, rose, ...
  typeset: sans              # body font stack: sans, serif, humanist, geometric, mono
  navbar: none               # navbar background: primary, background, or any CSS color
  footer: none               # footer background: primary, background, or any CSS color

# Optional — navigation
nav_order: {}                # map of section slug → ordered list of page slugs

# Optional — frontmatter keys mndsite reads (frontmatter is inert unless named here).
# `none` disables a mapping; pages then fall back to their slug for the title.
frontmatter:
  title: title
  description: [description, desc]
  date: date
  reading_time: reading_time
  related: related

  # Content dimensions — labels on articles and in Search
  facets:
    categories: { key: categories, label: Category, color: blue }   # blue, violet, amber, rose, green, teal, or 0-359
    tags:       { key: tags,       label: Tags,     color: violet }

# Optional — rendered elements, in display order; omit one to turn it off
display:
  crumbs: true                           # breadcrumb trail above the title
  header: [date, reading_time, facets]   # metadata under the title; accepts facet names
  toc: [description, sections, related]   # right sidebar (≥ xl)
  navbar: [browse, theme, feed, github]          # navbar icons, left to right

# Optional — consumer extensions
components: none             # React components mirrored into components/custom/
assets: none                 # static files mirrored into public/assets/

# Paths — resolved relative to this file
content: ./docs              # source markdown directory
output: ./dist               # output directory for built site
```

### Browsing pages by label

The **Pages** homepage lists all published pages when `homepage_feed` is enabled. Use the navbar search to match titles, paths, descriptions, labels, and page text. Searches from articles and article chips open the site-wide results, which can also be narrowed by label. Query text and filters are shareable, for example `/browse/?q=deployment` or `/browse/?facet=status&tag=stable`.

Declare labels in `frontmatter.facets`. A facet can read several keys. The `tags` facet uses Trendly's spelling normalization. Other facets retain their authored labels. For example:

```yaml
frontmatter:
  facets:
    tags: { key: [tags, keywords], label: Tags }
    topics: { key: topics, label: Topic, color: teal }
    edition: { key: edition, label: Edition }
```

The sidebar follows the content directory. Existing configurations can remove `frontmatter.groups` and `display.sidebar`. An old `versioning.key` is accepted as an ordinary facet for authored values. Builds no longer infer editions from Git or package metadata or export tagged snapshots. To keep historical pages online, include them in the content tree.

### Display and disabling features

Every rendered element is listed in `display`, and omitting it is how you turn it off —
there is no second switch. Zones and their elements:

| Zone | Elements | Renders |
|------|----------|---------|
| `crumbs` | `true` / `false` | Breadcrumb trail above the title |
| `header` | `date`, `reading_time`, `facets`, or any facet name | Date, reading time, facet chips |
| `toc` | `description`, `sections`, `related` | Right sidebar at ≥ xl |
| `contents` | same as `toc` | Inline Contents panel below the title (defaults to `toc`) |
| `navbar` | `browse`, `theme`, `feed`, `github` | Navbar icons |

`display.header` also accepts facet names directly:

```yaml
display:
  header: [date, status, tags]   # status chips between the date and tag chips
```

Frontmatter stays on the emitted page for Nextra; the reader sees values only through
`frontmatter` mappings into `site-meta.json` and the display zones above.

### Config contract version

The release version's `MAJOR.MINOR` **is** the config contract version — `0.3.x` releases
all read the **0.3** contract. There is no `contract:` key in the file and no load-time
rejection of retired keys; pre-1.0, an unknown top-level key is simply ignored.

[CHANGELOG.md](CHANGELOG.md) is the migration record — it lists what each contract version
added, changed, and removed, including the 0.1 → 0.2 key replacements.

### RSS subscriptions

Set the public site URL to enable a build-time RSS 2.0 feed.

```yaml
feed:
  path: /updates/
  include: [updates/, guides/release-notes.md]
rss:
  site_url: https://example.org/my-site/
```

MndSite writes `rss.xml` and adds RSS autodiscovery to the site. `feed.include` selects directories and individual Markdown files relative to `content`. Feed and RSS list the same dated pages, newest first, at their original URLs. The site tree follows the content directory and `nav_order`. Omit `feed.path` to link the navbar icon directly to RSS, or omit the `feed` block to include dated pages from across the site in RSS.

List repository-relative Markdown paths under `drafts` in `mndsite.yaml` to keep those files out of generated pages, navigation, and feeds. Remove a path from the list to publish it again at the same URL. You can also keep draft files and draft-only assets outside the published content directory.

```yaml
drafts:
  - docs/updates/working-note.md
```

Use the complete public site URL, including any GitHub Pages subpath. Keep the existing `BASE_PATH` setting for the build. Feed item IDs use the permanent post URL, so revisions at the same URL retain their IDs.

### Expandable post feed

Set `feed.path` to the public route for expandable cards. This route can be separate from the directories in `feed.include`. Each row expands to show the Markdown body, source cards, and a permanent link. Write a `description` in frontmatter or let mndsite generate an excerpt. The optional `sources` list supports an HTTP(S) `url` and optional `title`, `publisher`, `description`, `image_url`, `kind`, `audio_url`, `video_url`, and `placement`.

The card shows a media-type icon based on the first source, the post title, a source label, and the publication date. Use `site` to set the source label. Expanded cards show values from `frontmatter.facets`. Give a YouTube or direct audio link the Markdown title `"embed"` for a click-to-load player inside the expanded post. Set `placement: inline` on its source entry to show the player only in the body.

For a local preview, run `npm run watch -- --config <path>` and `npm run dev` in separate terminals. The watcher rebuilds the feed when the config or files in the content, assets, or components directories change.

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
