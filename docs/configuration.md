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

All site-level settings live in `mdsite.yaml` at your project root.
The CLI reads this file at build time and generates the internal `site.config.js`
consumed by Next.js and Nextra.

## Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | *(required)* | Site name — shown in the logo, footer, and page titles |
| `description` | string | `""` | SEO meta description added to every page's `<head>` |
| `repo_url` | string | `""` | GitHub repo link shown as an icon in the header; leave empty to hide |
| `feed_url` | string | `""` | Slug of the section used as the per-page continuation feed |
| `footer` | string | `""` | Custom footer credits text; empty keeps "Powered by mdsite and Nextra" |
| `theme_toggle` | string | `"navbar"` | Where the light/dark toggle appears: `"navbar"` or `"sidebar"` |
| `toc` | boolean | `true` | Right sidebar: "On This Page" section navigation |
| `reading_time` | boolean | `true` | Show estimated reading time in page headers and feeds |
| `extract.url` | string | `""` | Base URL of a running [taggly](https://github.com/kotulc/taggly) instance; empty disables extraction |
| `extract.on_build` | boolean | `false` | Extract on every build; otherwise only with the `--extract` flag |
| `extract.strict` | boolean | `true` | Fail the build when the service is unreachable; `false` warns and skips |
| `extract.max_comparisons` | integer | `128` | Cap on candidate terms/pages compared per `/rank` call |
| `extract.top_n_related` | integer | `3` | Number of related pages attached to each page node |
| `extract.extract_descriptions` | boolean | `false` | Generate a page-level SEO `desc` via `/desc` (sections never get one) |
| `extract.extract_concepts` | list | `[categories, topics, concepts]` | `/ext` concept groups to request; `[]` disables `/ext` entirely |
| `extract.max_concepts` | integer | `8` | Max terms kept per `/ext` concept group (via `/rank`) |
| `extract.max_keywords` | integer | `32` | Max `/key` keywords kept (via `/rank`) |
| `extract.max_entities` | integer | `8` | Max `/ent` entities kept (via `/rank`) |
| `extract.score_polarity` | boolean | `true` | Score `metrics.polarity` via `/polar` |
| `extract.score_toxicity` | boolean | `true` | Score `metrics.toxicity` via `/tox` |
| `extract.score_spam` | boolean | `true` | Score `metrics.spam` via `/spam` |
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

## Extraction

The `extract` block connects the build to a local [taggly](https://github.com/kotulc/taggly)
NLP service that layers metadata onto the [site graph](/specifications/metadata): every page
and section gets `tags` (concept groups via `/ext`, entities via `/ent`, keywords via `/key`)
and `metrics` (`polarity`/`spam`/`toxicity`), computed bottom-up (leaf sections scored
directly, parents aggregated). Pages optionally get a `desc` and always get a `related` list
scored from tag terms. All output lands in `public/site-meta.json` — never in frontmatter.

```yaml
extract:
  url: http://127.0.0.1:8000
  on_build: false        # true: extract on every build
  max_comparisons: 128   # cap on candidate terms/pages compared per /rank call
  top_n_related: 3       # related pages attached per page
  extract_descriptions: false        # true: generate a page-level SEO desc via /desc
  extract_concepts: [categories, topics, concepts]   # /ext groups; [] disables /ext
  max_concepts: 8        # max terms kept per /ext group
  max_keywords: 32       # max /key keywords kept
  max_entities: 8        # max /ent entities kept
  score_polarity: true
  score_toxicity: true
  score_spam: true
```

Extraction is opt-in per build — pass `--extract` to the CLI, or set `on_build: true`:

```bash
node scripts/cli.js build --config mdsite.yaml --extract
```

Without either, the build makes no network calls — the structural graph (folders, pages,
sections, word count, reading time, links, dates, content hash) is still written — and logs
that extraction was skipped. `npm run ingest` and the watcher read `mdsite.yaml` when
present, so `on_build: true` extracts there too; `--extract` is CLI-only.

Pages are only re-extracted when their content hash changes since the previous build —
unchanged pages copy their prior `tags`/`metrics`/`desc` forward with no taggly calls, so
incremental builds stay fast. Changing `extract.*` settings doesn't invalidate that cache;
delete `public/site-meta.json` to force a full re-extraction after a config change.
Extraction logs per-page progress as it runs.
See the [Metadata Contract](/specifications/metadata) spec for the full schema.

### Extraction in CI

The deploy workflow supports extraction behind the `ENRICH` repository variable: when
set to `true`, it installs taggly from source, starts it in the background, waits for
`/status`, and passes `--extract` to the CLI build. Model downloads are cached between
runs (`~/.cache/huggingface`). External projects using the mdsite Docker image can do
the same — run taggly next to the build container and point `extract.url` at it.

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
`BASE_PATH` as an environment variable at build time — do not put it in `mdsite.yaml`:

```bash
BASE_PATH=/repo-name node scripts/cli.js build --config mdsite.yaml
# or via Docker:
docker run --rm -e BASE_PATH=/repo-name -v $(pwd):/workspace ghcr.io/kotulc/mdsite ...
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
| `BASE_PATH` | _(empty)_ | Subpath prefix for project pages repos (e.g. `/mdsite`) |
| `ENRICH` | _(empty)_ | Set to `true` to run taggly NLP extraction during deployment |

## CLI overrides

The `--content` and `--output` flags override the corresponding YAML fields at runtime:

```bash
node scripts/cli.js build --config mdsite.yaml \
  --content /path/to/content \
  --output /path/to/output
```
