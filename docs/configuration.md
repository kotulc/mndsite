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
  - title: Content Pipeline
    url: /features/content-pipeline
  - title: Deployment
    url: /features/deployment
---

# Configuration

All site-level settings live in `mndsite.yaml`. In a mndmap workflow, mndmap emits this file at the destination root — it owns `content` and `nav_order` while preserving your theme, output, and deployment fields.

The CLI reads the YAML at build time and generates the internal `site.config.js` consumed by Next.js and Nextra.

## Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | *(required)* | Site name — shown in the logo, footer, and page titles |
| `description` | string | `""` | SEO meta description added to every page's `<head>` |
| `repo_url` | string | `""` | GitHub repo link shown as an icon in the header; leave empty to hide |
| `feed_url` | string | `""` | Section slug linked from the navbar feed icon |
| `footer` | string | `""` | Custom footer credits text; empty keeps "Powered by mndsite and Nextra" |
| `theme_toggle` | string | `"navbar"` | Where the light/dark toggle appears: `"navbar"` or `"sidebar"` |
| `theme.color` | string | `"default"` | Named accent palette — see [Theme](#theme) below |
| `theme.typeset` | string | `"sans"` | Named body font stack — see [Theme](#theme) below |
| `theme.navbar` | string | `""` | Navbar background: `"primary"` (theme tint) or any CSS color |
| `theme.footer` | string | `""` | Footer background: `"primary"` (theme tint) or any CSS color |
| `nav_order` | object | `{}` | Explicit nav ordering per directory — see below |
| `fields` | object | see below | Frontmatter keys behind the built-in metadata; frontmatter is inert unless named |
| `facets` | object | `categories`, `tags` | Content dimensions rendered as chips and filters — see [Facets](#facets) |
| `collections` | object | `{ default: all }` | Named facet presets; `default` names the active one |
| `sidebar.views` | list | `[tree]` | Left tree views: `tree` plus any facet name |
| `display` | object | see below | Rendered elements per zone, in display order — see [Display](#display) |
| `limits` | object | `header_chips: 8`, `related: 6` | Caps on chips and Related entries |
| `edit` | object | see below | "Edit this page" targets — **only used when `repo_url` is set** |
| `content` | path | `./docs` | Source markdown directory (resolved relative to this file) |
| `output` | path | `./dist` | Output directory for the built site (resolved relative to this file) |
| `components` | path | `""` | Optional directory of consumer React components, mirrored into `components/custom/` each build |
| `assets` | path | `""` | Optional directory of static files mirrored into `public/assets/` each build |

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
nav_order:
  "": [getting-started, configuration]
```

## Removed configuration keys

These keys are **rejected at load time** with migration guidance:

| Key | Move to |
|-----|---------|
| `meta` (tagging, related-link limits) | **mndmap** or frontmatter |
| `flatten` (inline directory feeds) | **mndmap** organization |
| `toc` (boolean) | `display.toc` — drop `sections` |
| `reading_time` (boolean) | `display.header` — drop `reading_time` |

mndsite configuration is limited to rendering, content paths, navigation order, theme, and deployment.

## Theme

The `theme` block styles the whole site from two named presets — no CSS required.

**`theme.color`** sets the accent palette used for links, active nav items, chips, and
buttons, in both light and dark mode. Available palettes:

`default` · `slate` · `gray` · `blue` · `indigo` · `violet` · `rose` · `orange` ·
`amber` · `emerald` · `teal` · `cyan`

**`theme.typeset`** sets the body font from a curated system-font stack — zero network
requests, no layout shift:

| Typeset | Style |
|---------|-------|
| `sans` | System UI sans (Nextra default) |
| `serif` | Charter / Sitka / Cambria / Georgia |
| `humanist` | Seravek / Ubuntu / Calibri |
| `geometric` | Avenir / Montserrat / Corbel |
| `mono` | System monospace |

**`theme.navbar`** and **`theme.footer`** override the navbar and footer backgrounds.
Set `"primary"` for a soft tint derived from `theme.color`, or any CSS color applied as-is:

```yaml
theme:
  color: emerald
  navbar: primary
  footer: "hsl(161 30% 96%)"
```

## Facets

Every content dimension mdsite renders is declared in `facets`. `field` is required; `label`,
`color`, `values`, `sort`, `default`, and `ui` are optional.

```yaml
facets:
  categories: { field: categories, label: Category, color: blue }
  tags:       { field: tags,       label: Tag,      color: violet }
  status:     { field: status,     values: [draft, stable, deprecated], default: [stable] }
  version:    { field: version,    sort: semver, default: latest, ui: select }
```

Chip colors are generated from each facet's hue — `blue`, `violet`, `amber`, `rose`, `green`,
`teal`, or a raw hue `0-359` — in both light and dark themes. Facets without a `color` take
the next palette entry in declaration order.

Values come from frontmatter only, never from paths and never generated. A page missing a
facet's field simply has no value for it, and keeps its route either way.

`collections` groups facet values into named presets (`default` names the active one), and
`sidebar.views` lists the left-tree tabs. Both are validated today; the filtering UI that
consumes them is in progress.

## Display

`display` lists which elements render, in which order. Omitting an element turns it off —
there is no second switch anywhere in the config.

```yaml
display:
  title_row: [info, contents]            # actions beside the page title
  header: [date, reading_time, facets]   # metadata under the title
  info: [description]                    # Info panel contents
  toc: [sections, related, edit]         # right sidebar, top to bottom
  navbar: [theme, feed, github]          # navbar icons, left to right
limits:
  header_chips: 8
  related: 6
```

`header` also accepts any facet name. Listing a facet there places its chips at that
position whatever its `ui` — so `header: [date, version, tags]` shows the version value
between the date and the tag chips. The generic `facets` element expands to every facet
with `ui: chips`.

The metadata line and the chip row are separate zones: `display.header` orders items
within each, and the chip row always follows the metrics line.

## Edit links

**Nothing in this section applies unless `repo_url` is set.** With no `repo_url` there is
no "Edit this page" link at all, and the `edit` block is ignored.

When `repo_url` is set, the link points at the repo copy of the file the page was built
from — `docs/features/overview.md`, not the site root.

```yaml
repo_url: https://github.com/user/repo
edit:
  branch: main     # branch the link targets
  path: docs       # repo-relative location of the content root
  url: ""          # template override; empty derives one from the repo_url host
```

`edit.path` defaults to the content directory resolved relative to `mndsite.yaml` — `docs`
for a standard layout, `""` when the content root *is* the repo root. If your config file
does not sit at the repo root, set it explicitly.

`edit.url` is a template over `{repo_url}`, `{branch}`, `{path}`, `{source}`, and `{file}`
(`path` and `source` joined). Defaults by host:

| Host | Template |
|------|----------|
| github.com | `{repo_url}/edit/{branch}/{file}` |
| gitlab.com | `{repo_url}/-/edit/{branch}/{file}` |
| bitbucket.org | `{repo_url}/src/{branch}/{file}?mode=edit` |
| anything else | none — the link falls back to `repo_url` itself |

Pages with no source file (an mndmap-generated landing page, for example) also fall back to
`repo_url`. To remove the link entirely, drop `edit` from `display.toc`.

In a mndmap workflow, point `repo_url` at the repository that holds the editable docs. If
it names a repo of generated output, edits made through the link are overwritten on the
next build.

## Metadata and tagging

mndsite does **not** run local keyword extraction, embedding models, or related-page scoring.
During ingest it derives `public/site-meta.json` from supplied frontmatter and page content only:

- `facets` from the declared frontmatter fields
- `related` from frontmatter `related` entries
- `links` from markdown link targets in the page body
- `metrics.word_count` computed from body text
- `metrics.reading_time` from frontmatter when present

Optional page summary: set `desc` or `description` in frontmatter — PageInfo shows it when present.

See the [Metadata Contract](/specifications/metadata) spec for the full schema.

## Nav ordering

Use `nav_order` to pin sibling order at any directory level. Slugs not listed sort alphabetically after the pinned entries.

In a mndmap workflow, mndmap generates `nav_order` from physical organization and sibling positions; mndsite honors it without applying a second policy.

```yaml
nav_order:
  "": [getting-started, configuration, features]
  features: [content-pipeline, metadata, deployment]
```

The key `""` refers to the source root. Other keys are subdirectory slugs.

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
  --content /path/to/mndmap/destination \
  --output /path/to/output
```
