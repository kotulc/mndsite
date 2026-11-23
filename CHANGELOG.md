# Changelog

Releases and the `mndsite.yaml` config contract move together: the release version's
`MAJOR.MINOR` **is** the contract version. `0.3.x` releases all read the 0.3 contract.

Pre-1.0, breaking config changes land in a minor bump and are listed here. There is no
in-file `contract:` key, and an unknown top-level key is ignored rather than rejected — this
file is the migration record. The one exception is a *renamed* key: a 0.2 block that moved
in 0.3 raises a load error naming the key to use instead, rather than silently doing nothing.


## 0.3.0 — 2026-08-29

Facets describe content; groups browse it; versioning tracks editions. `fields` and the
top-level `facets` block fold into one `frontmatter` block, the per-facet index flags move
out to a dedicated `versioning` block, and the left nav is driven by `display.sidebar`
instead of a flag on each facet.

### Added

- `frontmatter` — the block that owns every frontmatter key mndsite reads, with `facets`
  and `groups` nested inside it.
- `frontmatter.groups` — named bundles of facet names, or the bare word `versioning`.
  A group's chip order follows its facet list.
- `display.sidebar` — left-nav views in order: `pages` (the directory tree) plus group
  names. `[pages]` alone renders no view chips.
- `versioning` — optional edition tracking: `key`, `label`, `color`, `inherit`, `history`,
  `default`, `group_by`. Omitting the block turns it off. Stamps always sort as semver.
- `?field=<key>` — selects which of an open group's fields supplies the value chips.
- Semver values normalize to major.minor.patch (`0.2` → `0.2.0`; `v0.4.1` → `0.4.1`).
- A facet's `key` accepts a list, folding several frontmatter keys into one facet.

### Changed

- `sort: semver` compares major.minor.patch. Two-part stamps pad with `.0`.
- `display.crumbs` is a boolean. The trail is all-or-nothing, so a list said nothing a
  boolean does not.
- `theme.navbar` / `theme.footer` accept `background` to match the page background.
- `latest` is a value of the versioning stamp only. On any other field it is validated
  against the field's domain like any other value.

### Removed

- `collections` — named filter presets. Groups select a value; they do not hide the tree.
- `sidebar.views` — replaced by `display.sidebar`.
- `facets.*.ui` — page chips follow `display.header`; group chips are the view switcher.
- `facets.*.values` and `sort: listed` — facet values are open. Config declares dimensions,
  not vocabularies.
- `fields.identity` — never read by the renderer.

### Migration from 0.2

These renames are rejected at load time with the key to use instead:

| 0.2 | 0.3 |
|---|---|
| `fields:` | `frontmatter:` |
| top-level `facets:` | `frontmatter.facets:` |
| top-level `groups:` | `frontmatter.groups:` |
| `facets.<name>.field` | `facets.<name>.key` |
| `versioning.field` | `versioning.key` |
| `display.crumbs: [home, path]` | `display.crumbs: true` |

And these move out of a facet into the `versioning` block, which a group opts into by
listing the literal `versioning`:

| 0.2 | 0.3 |
|---|---|
| `facets.<name>.index: true` | add the group to `frontmatter.groups` and `display.sidebar` |
| `facets.<name>.inherit` | `versioning.inherit` |
| `facets.<name>.history` | `versioning.history` |
| `facets.<name>.default` | `versioning.default` |
| `facets.<name>.group_by` | `versioning.group_by` |
| `facets.<name>.values` | Removed — any frontmatter value renders |


## 0.2.0 — 2026-08-28

The first versioned contract. Facets, fields, and display lists are settled; collections
and sidebar views are declared and validated but not yet rendered.

### Added

- `facets` — declared content dimensions with `field`, `label`, `color`, `values`, `sort`,
  `default`, and `ui`. Chip colors are generated per facet hue in both themes.
- `fields` — the frontmatter keys mndsite reads. Frontmatter is inert unless named here.
- `display` — `crumbs`, `header`, `toc`, `contents`, `navbar`. Order is display order and
  omission is how an element is turned off.
- `collections` — named facet presets; `default` names the active one.
- `sidebar.views` — left-tree views: `tree` plus any facet name.
- `edit` — "Edit this page" targets, used only when `repo_url` is set.
- `theme.navbar` / `theme.footer` — background overrides.

### Changed

- **Every optional key has a named default instead of `""`.** `none` turns a feature off,
  `auto` derives a value, `default` keeps the built-in. A blank still reads as the default,
  so existing files keep working.

  | Key | 0.1 | 0.2 |
  |---|---|---|
  | `description`, `repo_url`, `feed_url` | `""` | `none` |
  | `components`, `assets` | `""` | `none` |
  | `footer` | `""` | `default` |
  | `theme.navbar`, `theme.footer` | `""` | `none` |
  | `edit.url` | `""` | `auto` |
  | `edit.path` | *(null)* | `auto` |

- **`fields.title` can now be disabled.** `title: none` means no frontmatter key names the
  page title, and pages fall back to their slug. It was previously the one field that
  ignored its mapping and always read `title`.

- **The emitted frontmatter `title` now tracks the resolved title.** Remapping
  `fields.title` used to change the nav label while Nextra kept deriving `<title>` and the
  search index from the original `title` key, so the two disagreed.

### Removed

- Load-time rejection of retired keys (`meta`, `flatten`, `toc`, `reading_time`,
  `theme_toggle`, `limits`, `display.title_row`, `display.info`). Pre-release, an unknown
  key is ignored rather than raising a migration error.

### Migration from 0.1

| 0.1 | 0.2 |
|---|---|
| `meta`, `flatten` | Move upstream to mndmap or frontmatter |
| `toc: false` | Drop `sections` from `display.toc` |
| `reading_time: false` | Drop `reading_time` from `display.header` |
| `theme_toggle: false` | Drop `theme` from `display.navbar` |
| `limits` | Removed — content renders as supplied |
| `display.title_row` | Removed — the Contents button follows `display.contents` |
| `display.info` | Renamed to `display.contents` |


## 0.1.0

Initial renderer: YAML config, ingest pipeline, Docker image, GitHub Pages workflow.
Never tagged.
