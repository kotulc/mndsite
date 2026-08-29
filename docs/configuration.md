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
version: 0.3
status: stable
---

# Configuration

All site-level settings live in `mndsite.yaml`. In a mndmap workflow, mndmap emits this file at the destination root — it owns `content` and `nav_order` while preserving your theme, output, and deployment fields.

The CLI reads the YAML at build time and generates the internal `site.config.js` consumed by Next.js and Nextra.

Only `title` is required. Every other key has a **named default** rather than a blank —
`none` turns a feature off, `auto` derives a value, `default` keeps the built-in behavior.
Writing `""` reads the same as the default, so no value in the file ever needs to be empty.

## Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | *(required)* | Site name — shown in the logo, footer, and page titles |
| `description` | string | `none` | SEO meta description added to every page's `<head>` |
| `repo_url` | string | `none` | GitHub repo link shown as an icon in the header; `none` hides it |
| `feed_url` | string | `none` | Section slug linked from the navbar feed icon |
| `footer` | string | `default` | Custom footer credits text; `default` keeps "Powered by mndsite and Nextra" |
| `theme.color` | string | `"default"` | Named accent palette — see [Theme](#theme) below |
| `theme.typeset` | string | `"sans"` | Named body font stack — see [Theme](#theme) below |
| `theme.navbar` | string | `none` | Navbar background: `"primary"` (theme tint) or any CSS color |
| `theme.footer` | string | `none` | Footer background: `"primary"` (theme tint) or any CSS color |
| `nav_order` | object | `{}` | Explicit nav ordering per directory — see below |
| `fields` | object | see below | Frontmatter keys behind the built-in metadata; frontmatter is inert unless named |
| `facets` | object | `categories`, `tags` | Content dimensions — page chips and optional left-nav indexes |
| `display.crumbs` | list | `[home, path]` | Breadcrumb trail above the page title |
| `display.header` | list | `[date, reading_time, facets]` | Metadata under the title; also accepts facet names |
| `display.toc` | list | `[description, sections, related, edit]` | Right sidebar at ≥ xl |
| `display.contents` | list | *(copy of `toc`)* | Inline Contents panel below the title |
| `display.navbar` | list | `[theme, feed, github]` | Navbar icons, left to right |
| `edit` | object | see below | "Edit this page" targets — **only used when `repo_url` is set** |
| `content` | path | `./docs` | Source markdown directory (resolved relative to this file) |
| `output` | path | `./dist` | Output directory for the built site (resolved relative to this file) |
| `components` | path | `none` | Optional directory of consumer React components, mirrored into `components/custom/` each build |
| `assets` | path | `none` | Optional directory of static files mirrored into `public/assets/` each build |

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

## Contract version

import Since from '../components/custom/Since'

<Since v="0.3" />

The release version's `MAJOR.MINOR` **is** the config contract version — `0.3.x` releases all
read the **0.3** contract. There is no `contract:` key in the file, and pre-1.0 an unknown
top-level key is ignored rather than rejected.

`CHANGELOG.md` is the migration record: what each contract version added, changed, and
removed, including the 0.1 keys (`meta`, `flatten`, `toc`, `reading_time`, `theme_toggle`,
`limits`, `display.title_row`, `display.info`) and the 0.2 keys (`collections`, `sidebar.views`,
`facets.*.ui`).

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

## Frontmatter fields

`fields` maps mndsite's built-in renderer metadata onto the frontmatter keys that carry it.
No key means anything unless `fields` or `facets` names it.

```yaml
fields:
  title: title
  description: [description, desc]   # a list tries each key in order
  date: date
  reading_time: reading_time
  related: related
  identity: doc_id
  # title: none                      # disable: pages fall back to their slug
```

Setting a mapping to `none` disables it. With `title: none` no frontmatter key names the
page title, and every page falls back to a title derived from its filename — the nav label
and the browser `<title>` stay in step either way, so nothing goes unnamed in the tree.

Remapping `title` to another key relabels the page everywhere: ingest stamps the resolved
title back onto the emitted frontmatter, so Nextra's `<title>` and search index match the
navigation label.

## Facets

Every content dimension mndsite renders is declared in `facets`. `field` is required; `label`,
`color`, `values`, `sort`, `index`, `inherit`, `history`, `default`, and `group_by` are optional.
On/off flags are booleans.

```yaml
facets:
  categories: { field: categories, label: Category, color: blue }
  tags:       { field: tags,       label: Tag,      color: violet, index: true }
  status:     { field: status,     values: [draft, stable, deprecated], sort: listed }
  version:
    field: version
    sort: semver           # alpha, semver, date, listed
    default: latest        # latest, or a specific version
    inherit: true
    history: true
    group_by: status
    index: true
```

Chip colors are generated from each facet's hue — `blue`, `violet`, `amber`, `rose`, `green`,
`teal`, or a raw hue `0-359` — in both light and dark themes. Facets without a `color` take
the next palette entry in declaration order.

Values come from frontmatter only, never from paths and never generated. A page missing a
facet's field simply has no value for it, and keeps its route either way.

### Indexes

`index: true` adds a chip after **Pages** in the left nav. With no indexed facets, Pages is
the only view and no chips render. Selecting an index replaces the directory tree with that
facet's values; the body lists matching pages (title and excerpt). This is a view switcher,
not a filter — every page keeps its route.

`default` is the preselected value in that index (`latest` for `sort: semver` or `date`).
`group_by` names another facet used as headings over the value list. `inherit: true` fills
a missing stamp from the site release (`package.json`, then the nearest git tag).
`history: true` ingests exact `vMAJOR.MINOR.PATCH` git tags as frozen trees under
`/_history/<version>/`, hidden from the Pages tree.

Selection lives in the URL:

| Param | Effect |
|---|---|
| `?view=<name>` | Switch index — `pages` (default) or a facet with `index: true` |
| `?on=<value>` | Select a value in that index; `latest` is the default for semver |

## Display

`display` lists which elements render in each zone, in order. Omitting an element turns it off — there is no second switch anywhere in the config.

```yaml
display:
  crumbs: [home, path]
  header: [date, reading_time, facets]
  toc: [description, sections, related, edit]
  navbar: [theme, feed, github]
```

| Zone | Elements | Component |
|------|----------|-----------|
| `crumbs` | `home`, `path` | `Breadcrumbs` — trail above the title |
| `header` | `date`, `reading_time`, `facets`, or any facet name | `PageHeader` + `TagList` |
| `toc` | `description`, `sections`, `related`, `edit` | `PageContents` in the right sidebar |
| `contents` | same vocabulary as `toc` | `PageContents` in the inline Contents panel |
| `navbar` | `theme`, `feed`, `github` | `ThemeToggle`, `FeedLink`, `GitHubLink` |

`display.contents` defaults to a copy of `display.toc` when omitted. Set it separately only when the inline panel should differ from the sidebar.

When `display.toc` includes `sections`, Nextra owns the heading list and scroll-spy in the sidebar; `PageContents` renders the description above Nextra's label and Related/Edit below. When `sections` is omitted, `PageContents` renders the whole sidebar list.

Below the `xl` breakpoint Nextra hides the right sidebar. A **Contents** button in the title row opens the same `PageContents` body inline, driven by `display.contents`.

`theme` in `display.navbar` is the only theme toggle — Nextra's sidebar toggle is disabled. Chips and Related entries render as supplied; nothing is truncated.

`header` also accepts any facet name. Listing a facet there places its chips at that position — so `header: [date, version, tags]` shows version chips between the date and tag chips. The generic `facets` element expands to every declared facet not already named.

## Edit links

**Nothing in this section applies unless `repo_url` is set.** With no `repo_url` there is
no "Edit this page" link at all, and the `edit` block is ignored.

When `repo_url` is set, the link points at the repo copy of the file the page was built
from — `docs/features/overview.md`, not the site root.

```yaml
repo_url: https://github.com/user/repo
edit:
  branch: main     # branch the link targets
  path: auto       # `auto` uses the content dir, resolved relative to this file
  url: auto        # `auto` derives a template from the repo_url host
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

Optional page summary: set `desc` or `description` in frontmatter (mapped via `fields.description`) — shown in the sidebar or Contents panel when `description` is listed in `display.toc`.

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
