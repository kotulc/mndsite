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
| `icon` | string | `none` | Site-relative image path for the navbar mark and browser favicon, such as `/assets/mnd.svg` |
| `description` | string | `none` | SEO meta description added to every page's `<head>` |
| `repo_url` | string | `none` | GitHub repo link shown as an icon in the header; `none` hides it |
| `feed.path` | string | unset | Public route for the expandable Feed page and its navbar link |
| `feed.include` | list | all dated content if `feed` is omitted | Files and directories to select, relative to `content`. Feed and RSS use the same selection. |
| `homepage_feed` | boolean | `false` | Show published pages as cards on the homepage, after any authored index content. Cards follow the sidebar's reading order by default. Search them from the navbar or use the label and date controls. |
| `rss.site_url` | URL | unset | Absolute deployed site URL, including its base path. Enables RSS at `rss.xml` |
| `drafts` | list | `[]` | Repository-relative Markdown paths to omit from publication |
| `footer` | string | `default` | Custom footer credits text; `default` keeps "Powered by mndsite and Nextra" |
| `theme.color` | string | `"default"` | Named accent palette — see [Theme](#theme) below |
| `theme.typeset` | string | `"sans"` | Named body font stack — see [Theme](#theme) below |
| `theme.navbar` | string | `none` | Navbar background: `primary` (theme tint), `background` (match page), or any CSS color |
| `theme.footer` | string | `none` | Footer background: `primary` (theme tint), `background` (match page), or any CSS color |
| `nav_order` | object | `{}` | Explicit nav ordering per directory — see below |
| `frontmatter` | object | see below | Frontmatter keys and facet definitions |
| `display.crumbs` | bool | `true` | Breadcrumb trail above the page title |
| `display.header` | list | `[date, reading_time, facets]` | Metadata under the title; also accepts facet and frontmatter key names |
| `display.toc` | list | `[description, sections, related, edit]` | Right sidebar |
| `display.navbar` | list | `[browse, feed, github, theme]` | Navbar icons, left to right |
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
feed:
  path: /updates/
  include: [updates/, guides/release-notes.md]
rss:
  site_url: https://myuser.github.io/my-repo/
drafts:
  - docs/updates/work-in-progress.md
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
`limits`, `display.title_row`, `display.info`) and the 0.2 keys (`collections`,
`sidebar.views`, `facets.*.ui`). The 0.2 → 0.3 renames are the exception to "unknown keys
are ignored": `fields`, top-level `facets`, and top-level `groups` are rejected at load
time with the key to use instead.

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

| Value | Effect |
|-------|--------|
| `none` | Nextra defaults (navbar white/dark; footer light gray / dark neutral) |
| `primary` | Soft tint from `theme.color` |
| `background` | Match the page background (white in light mode, `#111` in dark) |
| CSS color | Applied as-is in both modes, e.g. `"#f8fafc"` |

```yaml
theme:
  color: emerald
  navbar: background
  footer: background
```

## Frontmatter

`frontmatter` maps mndsite's built-in renderer metadata onto the frontmatter keys that carry
it. The nested `facets` block declares labels for Search and article chips. No key
means anything unless `frontmatter` names it.

```yaml
frontmatter:
  title: title
  description: [description, desc]   # a list tries each key in order
  date: date
  reading_time: reading_time
  related: related
  # title: none                      # disable: pages fall back to their slug
```

Setting a mapping to `none` disables it. With `title: none` no frontmatter key names the
page title, and every page falls back to a title derived from its filename — the nav label
and the browser `<title>` stay in step either way, so nothing goes unnamed in the tree.

Remapping `title` to another key relabels the page everywhere. Ingest writes the resolved
title to the emitted frontmatter and page metadata so the browser title, search results,
and navigation label agree.

## Facets

`frontmatter.facets` declares every content dimension mndsite renders. `key` is required;
`label`, `color`, and `sort` are optional.

```yaml
frontmatter:
  facets:
    categories: { key: categories, label: Category, color: blue }
    tags:       { key: tags,       label: Tags,     color: violet }
    status:     { key: status,     label: Status,   color: amber, sort: alpha }
```

| Key | Default | Purpose |
|---|---|---|
| `key` | *(required)* | Frontmatter key to read; a list folds several keys into one facet |
| `label` | facet name, title-cased | Chip tooltip and index heading |
| `color` | next palette entry | `blue`, `violet`, `amber`, `rose`, `green`, `teal`, or a hue `0-359` |

`categories`, `tags`, and `status` are always declared — naming one only overrides it.
Chip colors are generated from each facet's hue in both light and dark themes, so a
user-defined facet gets a coherent chip without any CSS.

Values come from frontmatter only, never from paths and never generated. A page missing a
facet's key simply has no value for it, and keeps its route either way.

## Pages

When `homepage_feed` is enabled, the **Pages** homepage lists all published pages. Use the navbar search to match titles, paths, descriptions, labels, and page text. Searches from articles and article chips open site-wide results. Sites can also link directly to the results by including `browse` in `display.navbar`. Query text and filters are shareable, for example `/browse/?q=deployment` or `/browse/?facet=status&tag=stable`.

Declare labels in `frontmatter.facets`. A facet can read several keys. The `tags` facet uses Trendly's spelling normalization. Other facets retain their authored labels. For example:

```yaml
frontmatter:
  facets:
    tags: { key: [tags, keywords], label: Tags }
    topics: { key: topics, label: Topic, color: teal }
    edition: { key: edition, label: Edition }
```

If your content already uses `/browse/`, the generated listing uses `/browse-pages/` and its links update automatically. Older sidebar links with a recognized field and value open Pages with the corresponding label filter. Other former views open the page list.

The sidebar follows the content directory. Existing configurations can remove `frontmatter.groups` and `display.sidebar`. An old `versioning.key` is accepted as an ordinary facet for authored values. Builds no longer infer editions from Git or package metadata or export tagged snapshots. To keep historical pages online, include them in the content tree.

## Reading cards

Set a site-wide default in `mndsite.yaml`:

```yaml
reading_cards:
  max_depth: 2
```

Depth 2 folds each `##` section into a card. Depth 3 also folds `###` subsections inside
their parent card. The page introduction and the Pages and Feed listings stay visible.
In page frontmatter, set `reading_cards_depth: 3` to try nested folding or
`reading_cards: false` to show the whole article.

Set `reading_cards: false` in `mndsite.yaml` to disable reading cards for every page,
including pages with a depth or summary map in their frontmatter. To enable cards only
on selected pages, omit the site-wide setting and give those pages a depth or summary map.

The optional `reading_cards` frontmatter map keys short previews by heading anchor.
Existing heading links work with generated or explicit anchors. Search opens the
matching card and its parent if needed.

## Display

`display` lists which elements render in each zone, in order. Omitting an element turns it off — there is no second switch anywhere in the config. `crumbs` is the one boolean: the trail is all-or-nothing.

```yaml
display:
  crumbs: true
  header: [date, reading_time, facets]
  toc: [description, sections, related, edit]
  navbar: [browse, feed, github, theme]
```

| Zone | Elements | Component |
|------|----------|-----------|
| `crumbs` | `true` / `false` | `Breadcrumbs` — trail above the title |
| `header` | `date`, `reading_time`, `facets`, or any facet or frontmatter key name | `PageHeader` + `TagList` |
| `toc` | `description`, `sections`, `related`, `edit` | `PageContents` in the right sidebar |
| `navbar` | `browse`, `theme`, `feed`, `github` | `ThemeToggle`, `FeedLink`, `GitHubLink` |

When `display.toc` includes `sections`, Nextra owns the heading list and scroll-spy in the sidebar; `PageContents` renders the description above Nextra's label and Related/Edit below. When `sections` is omitted, `PageContents` renders the whole sidebar list.

`theme` in `display.navbar` is the only theme toggle — Nextra's sidebar toggle is disabled. Chips and Related entries render as supplied; nothing is truncated.

`header` also accepts any facet name. Listing a facet there places its chips at that position — so `header: [date, status, tags]` shows status chips between the date and tag chips. The generic `facets` element expands to every declared facet not already named.

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

Optional page summary: set `desc` or `description` in frontmatter (mapped via `frontmatter.description`) — shown in the sidebar or Contents panel when `description` is listed in `display.toc`.

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
