# mndsite configuration surface

## Historical configuration design

This document records the earlier sidebar and edition design. Use [the configuration reference](docs/configuration.md) and [the site configuration](mndsite.yaml) for current browse and tagging behavior.

## Status

This was the design for the 0.3 sidebar implementation and its proposed search work.

Contract version: **0.3** (= release `0.3.x`). `CHANGELOG.md` is the migration record.

Companion documents: `docs/updates/simplification.md` (pipeline split), `README.md`
(user-facing reference), `docs/specifications/metadata.md` (`site-meta.json` schema).

## Principles

| Principle | Consequence |
|---|---|
| Config is the only interpreter of frontmatter | No key means anything unless `frontmatter` names it |
| Every optional key names its default | `none`, `auto`, or `default` — no value in the file is ever blank |
| Every rendered element can be turned off | Absence from a `display` list disables it |
| Order is data, not code | `display` lists set order; there is no hidden precedence |
| On/off flags are booleans | Enums are used only when more than one value is valid |
| Groups switch the left nav and body | They do not hide routes; Pages is always the full tree |
| mndsite renders, mndmap organizes | Facet values come from frontmatter; `versioning` may fill or snapshot |

## Full file

```yaml
# ---- Identity (built) -----------------------------------------------------
title: My Site                 # required
description: none              # SEO meta description on every page
repo_url: none                 # GitHub icon + edit link; `none` hides both
feed_url: none                 # section slug behind the navbar feed icon
expandable_feed: false         # list expandable posts at the feed_url section
rss: false                     # opt in with { site_url: https://example.org/site/ }
footer: default                # footer credits; `default` keeps the built-in

# ---- Theme (built) --------------------------------------------------------
theme:
  color: default               # default, slate, blue, emerald, rose, ...
  typeset: sans                # sans, serif, humanist, geometric, mono
  navbar: none                 # none, primary, background, or any CSS color
  footer: none                 # none, primary, background, or any CSS color

# ---- Frontmatter keys, facets, and groups (built) --------------------------
frontmatter:
  title: title                 # `none` disables a mapping; title falls back to the slug
  description: [description, desc]
  date: date
  reading_time: reading_time
  related: related

  # Content dimensions. categories, tags and status are always declared;
  # naming one here only overrides it.
  facets:
    categories:
      key: categories          # required; frontmatter key, or a list of them
      label: Category          # default: facet name, title-cased
      color: blue              # blue, violet, amber, rose, green, teal, or hue 0-359
      sort: alpha              # alpha, semver, date
    tags:
      key: tags
      label: Tags
      color: violet
    status:
      key: status
      color: amber

  # Left-nav browse groups: a list of facet names, or the bare word `versioning`.
  groups:
    Tags: [tags]
    Topics: [categories, tags]
    Versions: [status, versioning]

# ---- Edition tracking (built) ---------------------------------------------
# Optional; omit the block to turn it off. A group opts in via the `versioning` token.
versioning:
  key: version                 # frontmatter key holding the stamp
  label: Versions
  color: teal
  inherit: true                # fill missing stamps from package.json / git tag
  history: true                # ingest vMAJOR.MINOR.PATCH git tags as frozen trees
  default: latest              # latest, or a specific version
  group_by: status             # another facet, used as headings over the value list

# ---- Element display and order (built) ------------------------------------
display:
  crumbs: true                                  # breadcrumb trail above the title
  sidebar: [pages, Topics, Tags, Versions]      # left-nav views; `pages` is the tree
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
| Chips under the title | `facets` from `display.header` |
| One facet's header chips | drop that name from `display.header` (and from the `facets` catch-all) |
| Breadcrumb trail | `display.crumbs: false` |
| Description in the sidebar | `description` from `display.toc` |
| Inline Contents panel | empty `display.contents` |
| Right sidebar entirely | empty `display.toc` |
| Related list | `related` from `display.toc` |
| Edit-this-page link | `edit` from `display.toc`, or clear `repo_url` (which disables edit links entirely) |
| Search | `search.enabled: false`, or `search` from `display.navbar` |
| Theme toggle | `theme` from `display.navbar` |
| Left-nav view chips | leave `display.sidebar` at `[pages]` |
| Edition tracking | omit the `versioning` block |

Reordering is the same edit: change list order.

## Behavior decisions

| Decision | Rule |
|---|---|
| Facet source | Frontmatter; `versioning.inherit` may fill a missing stamp from the site release |
| Facet values | Open — any value in frontmatter is rendered; there is no allow-list |
| Groups | Each `display.sidebar` entry adds a chip beside Pages; `[pages]` alone means no chips |
| Group state | `?view=<group>&field=<key>&on=<value>` — listing body, full tree when view is pages |
| Semver | major.minor.patch; `0.2` and `v0.2.0` normalize to `0.2.0` |
| Latest | Versioning stamp only. With `history`, the current tree; without, HEAD pages at the highest stamp |
| History | `versioning.history: true` ingests `vMAJOR.MINOR.PATCH` git tags as `/_history/<version>/` |
| Chip colors | Generated per facet hue, light and dark; undeclared facets use `chip-custom` |
| Search index | Separate `public/search-index.json`, fetched on demand — never merged into `site-meta.json` |
| Edit links | Point at the repo copy of the built-from file, relative to the content root; require `repo_url` |

## Cut

| Cut | State | Why |
|---|---|---|
| Section tag mosaic in PageInfo | done | Sections carried no tags after enrichment moved upstream |
| Fixed tag vocabulary (`category\|topic\|concept\|entity\|user`) | done | Replaced by declared facets |
| Local tagging, embeddings, related scoring, vendored model | done | mndmap/Taggly owns enrichment |
| `meta`, `flatten` config keys | done | Dropped; pre-1.0 an unknown key is ignored |
| `page.tags` in `site-meta.json` | done | Replaced by per-facet `page.facets` |
| `toc` and `reading_time` booleans | done | Superseded by `display` lists; see CHANGELOG |
| `theme_toggle` (and the sidebar toggle) | done | `display.navbar` is the only switch; sidebar placement dropped |
| `limits` (chip and Related caps) | done | Counts are authored frontmatter — truncating hides what the author wrote |
| `_assets/` module imports in MDX | done | `public/` is outside the module graph; ingest warns instead |
| Load-time rejection of retired keys | done | Pre-release; `CHANGELOG.md` is the migration record |
| `collections`, `sidebar.views`, `facets.*.ui` | done | Replaced by `frontmatter.groups` + `display.sidebar` in 0.3 |
| `facets.*.index/inherit/history/default/group_by` | done | Edition behavior moved to the `versioning` block |
| `facets.*.values` and `sort: listed` | done | Facet values are open; config declares dimensions, not vocabularies |
| `fields`, top-level `facets` / `groups` | done | Nested under `frontmatter`; rejected at load with the new key |
| `display.crumbs` as a list | done | The trail is all-or-nothing; a boolean says so |

## Kept

| Kept | Why |
|---|---|
| Published feed | mndsite exports dated posts as expandable cards and RSS. Trendly previews the cards and manages subscriptions. |
| Legacy `images/` copy + EXIF stripping | mndsite must build raw markdown with no mndmap in the pipeline |
| `components` / `assets` sync | Consumer extension points, unrelated to the pipeline split |

## Frontmatter and rendering

Frontmatter is metadata, not content. The supplied block stays on the emitted `.mdx` so
Nextra and theme components can read it, and it never renders as page text — verified
against the built HTML. It reaches a reader only through a mapping:

| Mapping | Renders as |
|---|---|
| `frontmatter.title` | Page title, nav label, `<title>` |
| `frontmatter.description` | Contents panel summary, `<meta name="description">` |
| `frontmatter.date` / `frontmatter.reading_time` | Metadata line, per `display.header` |
| `frontmatter.related` | Related list in the right sidebar |
| `page.source` (recorded by ingest) | Nothing directly — the "Edit this page" target |
| any `frontmatter.facets` entry | Header chips, and value chips in any group listing it |
| `versioning.key` | Version chips, and the value list of a `versioning` group |
| anything else | Nothing — available to custom MDX components, invisible otherwise |

## Open questions

1. **Search index scaling** — one JSON today. Chunking trigger is unresolved: split per
   top-level directory, or keep one file and cap indexed body length?
2. **Header zones** — `display.header` orders the metrics line and the chip row separately.
   Strict linear interleaving (a chip between date and reading time) would need a layout change.

## Build order

1. **Facets and metadata** — done: config schema, frontmatter projection, generated chip colors.
2. **Display lists** — done: `display` replaces the booleans; `limits` and `theme_toggle` cut.
3. **Groups** — done: sidebar view chips, value lists, listing body, versioning inherit and git-tag history.
4. **Search** — index emitted at ingest, `/search` route rendering results in the page body.
