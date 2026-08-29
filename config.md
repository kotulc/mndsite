# mndsite configuration surface

## Status

Planned shape of the complete `mndsite.yaml`. Sections marked **built** are in the code
today; **planned** sections are the target for the filtering and search work. This document
is the reference for what mdsite reads, what a user can turn off, and what gets cut.

Contract version: **0.2** (= release `0.2.x`). `CHANGELOG.md` is the migration record.

Companion documents: `docs/updates/simplification.md` (pipeline split), `README.md`
(user-facing reference), `docs/specifications/metadata.md` (`site-meta.json` schema).

## Principles

| Principle | Consequence |
|---|---|
| Config is the only interpreter of frontmatter | No field means anything unless `fields` or `facets` names it |
| Every optional key names its default | `none`, `auto`, or `default` — no value in the file is ever blank |
| Every rendered element can be turned off | Absence from a `display` list disables it |
| Order is data, not code | `display` lists set order; there is no hidden precedence |
| Filtering scopes the left tree only | Routes, page bodies, search results, and feeds are never filtered |
| mdsite renders, mndmap organizes | Facet values come from frontmatter, never from paths |

## Full file

```yaml
# ---- Identity (built) -----------------------------------------------------
title: My Site                 # required
description: none              # SEO meta description on every page
repo_url: none                 # GitHub icon + edit link; `none` hides both
feed_url: none                 # section slug behind the navbar feed icon
footer: default                # footer credits; `default` keeps the built-in

# ---- Theme (built) --------------------------------------------------------
theme:
  color: default               # default, slate, blue, emerald, rose, ...
  typeset: sans                # sans, serif, humanist, geometric, mono
  navbar: none                 # none, "primary", or any CSS color
  footer: none                 # none, "primary", or any CSS color

# ---- Frontmatter keys (built) ---------------------------------------------
fields:
  title: title                 # `none` disables a mapping; title falls back to the slug
  description: [description, desc]
  date: date
  reading_time: reading_time
  related: related
  identity: doc_id             # groups variants of one document (from mndmap)

# ---- Content dimensions (built) -------------------------------------------
facets:
  categories:
    field: categories          # required; frontmatter key
    label: Category            # default: facet name, title-cased
    color: blue                # blue, violet, amber, rose, green, teal, or hue 0-359
    ui: chips                  # chips | select | badge | none
    sort: alpha                # alpha | semver | date | listed
  tags:
    field: tags
    label: Tag
    color: violet
  # version:                   # versioning is a facet, not a separate feature
  #   field: version
  #   sort: semver
  #   default: latest          # active value when no filter is applied
  #   ui: select
  #   rollup: true             # planned: collapse same-identity pages to one entry
  # status:
  #   field: status
  #   values: [draft, stable, deprecated]
  #   default: [stable, deprecated]
  #   color: amber

# ---- Named facet presets (built) ------------------------------------------
collections:
  default: all                 # name of the active preset, or "all"
  # latest:  { version: latest, status: [stable] }
  # archive: { version: all, status: [deprecated] }

# ---- Left tree (built) ----------------------------------------------------
sidebar:
  views: [tree]                # "tree" plus any facet name, in tab order

# ---- Element display and order (built) ------------------------------------
display:
  crumbs: [home, path]                          # breadcrumb trail above the title
  header: [date, reading_time, facets]          # metadata line under the title
  toc: [description, sections, related, edit]   # right sidebar, top to bottom
  contents: [description, sections, related]    # inline panel; defaults to a copy of toc
  navbar: [theme, feed, github]                 # navbar icons; "search" joins at stage 5
                                                # "theme" is the only theme-toggle switch

# ---- Search (planned) -----------------------------------------------------
search:
  enabled: true
  route: /search               # results render in the page body at this route
  index: [title, description, headings, body]
  # one JSON for the whole site; revisit chunking when a site outgrows a single fetch

# ---- Edit links (built) ---------------------------------------------------
# Used only when repo_url is set; with no repo_url there is no link and this is ignored.
edit:
  branch: main                 # branch the link targets
  path: auto                   # repo-relative content root; `auto` uses the content dir
  url: auto                    # template override; `auto` derives one from the repo_url host

# ---- Navigation and paths (built) -----------------------------------------
nav_order: {}                  # directory slug → ordered page slugs
content: ./docs
output: ./dist
components: none               # consumer React components → components/custom/
assets: none                   # static files → public/assets/
```

## Turning things off

One mechanism: omit the element from its `display` list. No feature has a second switch.

| To disable | Remove |
|---|---|
| Publication date | `date` from `display.header` |
| Reading time | `reading_time` from `display.header` |
| Chips under the title | `facets` from `display.header`, or set a facet's `ui: none` |
| One facet's chips only | that facet's `ui: none` (it can still filter the tree) |
| Description in the sidebar | `description` from `display.toc` |
| Inline Contents panel | empty `display.contents` |
| Right sidebar entirely | empty `display.toc` |
| Related list | `related` from `display.toc` |
| Edit-this-page link | `edit` from `display.toc`, or clear `repo_url` (which disables edit links entirely) |
| Search | `search.enabled: false`, or `search` from `display.navbar` |
| Theme toggle | `theme` from `display.navbar` |
| Facet tabs in the left tree | leave `sidebar.views` as `[tree]` |

Reordering is the same edit: change list order.

## Behavior decisions

| Decision | Rule |
|---|---|
| Facet source | Frontmatter only — never path segments, never generated |
| Missing facet value | Page matches any filter on that facet; it never disappears |
| Value outside `values` | Dropped at ingest; config stays authoritative |
| Filter scope | Left tree only; every page keeps its route and its place in search |
| Filter state | Query params — `?status=stable&version=v2&view=tags`, `?c=latest` |
| Constraint precedence | Query param > active collection's preset > the facet's own `default` > unconstrained |
| Directory rows | A directory shows while any descendant survives the filter |
| Default collection | Seeds client-side filter state; every page stays in the page map so a wider collection restores it |
| Chip colors | Generated per facet hue, light and dark; undeclared facets use `chip-custom` |
| Versioning | A facet with `sort: semver` + `default: latest`, plus `fields.identity` for rollup |
| Search index | Separate `public/search-index.json`, fetched on demand — never merged into `site-meta.json` |
| Edit links | Point at the repo copy of the built-from file, relative to the content root; require `repo_url` |

## Cut

| Cut | State | Why |
|---|---|---|
| Section tag mosaic in PageInfo | done | Sections carried no tags after enrichment moved upstream |
| Fixed tag vocabulary (`category\|topic\|concept\|entity\|user`) | done | Replaced by declared facets |
| Local tagging, embeddings, related scoring, vendored model | done | mndmap/Taggly owns enrichment |
| `meta`, `flatten` config keys | done | Dropped; pre-1.0 an unknown key is ignored |
| `page.tags` in `site-meta.json` | done | Replaced by `facets` + `identity` |
| `toc` and `reading_time` booleans | done | Superseded by `display` lists; see CHANGELOG |
| `theme_toggle` (and the sidebar toggle) | done | `display.navbar` is the only switch; sidebar placement dropped |
| `limits` (chip and Related caps) | done | Counts are authored frontmatter — truncating hides what the author wrote |
| `_assets/` module imports in MDX | done | `public/` is outside the module graph; ingest warns instead |
| Load-time rejection of retired keys | done | Pre-release; `CHANGELOG.md` is the migration record |
| `""` as an optional key's default | done | Every optional key names its default: `none`, `auto`, `default` |

## Kept

| Kept | Why |
|---|---|
| `DirFeed` + `public/dir-feeds/` | mndmap flattens the content; mdsite still owns linking and presentation, including a navbar feed button pointing at an updates page |
| Legacy `images/` copy + EXIF stripping | mndsite must build raw markdown with no mndmap in the pipeline |
| `components` / `assets` sync | Consumer extension points, unrelated to the pipeline split |

## Frontmatter and rendering

Frontmatter is metadata, not content. The supplied block stays on the emitted `.mdx` so
Nextra and theme components can read it, and it never renders as page text — verified
against the built HTML. It reaches a reader only through a mapping:

| Mapping | Renders as |
|---|---|
| `fields.title` | Page title, nav label, `<title>` |
| `fields.description` | Info panel summary, `<meta name="description">` |
| `fields.date` / `fields.reading_time` | Metadata line, per `display.header` |
| `fields.related` | Related list in the right sidebar |
| `fields.identity` | Nothing directly — version rollup and switching |
| `page.source` (recorded by ingest) | Nothing directly — the "Edit this page" target |
| any `facets` entry | Chips, and the left-tree filters |
| anything else | Nothing — available to custom MDX components, invisible otherwise |

## Open questions

1. **Search index scaling** — one JSON today. Chunking trigger is unresolved: split per
   top-level directory, or keep one file and cap indexed body length?
2. **Feed contract** — `DirFeed` needs a producer. Does mndmap emit feed entries for a
   flattened directory, or does mdsite build them from the pages it already ingests?
3. **Header zones** — `display.header` orders the metrics line and the chip row separately.
   Strict linear interleaving (a chip between date and reading time) would need a layout change.

## Build order

1. **Facets and metadata** — done: config schema, frontmatter projection, generated chip colors.
2. **Display lists** — done: `display` replaces the booleans; `limits` and `theme_toggle` cut.
3. **Left tree filtering** — done: `sidebar.views` tabs, collection selector, query params.
   The default collection seeds client-side state rather than pre-filtering at build, so
   switching collection can widen the tree back out.
4. **Version rollup** — `fields.identity` + `rollup`, in-place version switching.
5. **Search** — index emitted at ingest, `/search` route rendering results in the page body.
