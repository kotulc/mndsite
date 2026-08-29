# Changelog

Releases and the `mndsite.yaml` config contract move together: the release version's
`MAJOR.MINOR` **is** the contract version. `0.3.x` releases all read the 0.3 contract.

Pre-1.0, breaking config changes land in a minor bump and are listed here. There is no
in-file `contract:` key and no load-time rejection of retired keys — an unknown top-level
key is ignored, and this file is the migration record.


## 0.3.0 — 2026-08-29

Indexes replace collections. The left nav is the directory tree (Pages) or a facet's
values; the body lists matching pages. Version stamps inherit the site release and
optional git-tag snapshots keep older trees.

### Added

- `facets.*.index` — boolean. Puts a chip after Pages; chips hide when no facet is an index.
- `facets.*.inherit` — boolean. Missing stamps take the site release (`package.json`, then git tag).
- `facets.*.history` — boolean. Ingest exact `vMAJOR.MINOR.PATCH` git tags as frozen trees.
- `facets.*.group_by` — another facet, used as headings in that index.
- `facets.*.default` — selected index value (`latest`, or a specific value).
- Semver values normalize to major.minor.patch (`0.2` → `0.2.0`; `v0.4.1` → `0.4.1`).

### Changed

- `sort: semver` compares major.minor.patch. Two-part stamps pad with `.0`.

### Removed

- `collections` — named filter presets. Indexes select a value; they do not hide the tree.
- `sidebar.views` — replaced by `index: true` plus built-in Pages.
- `facets.*.ui` — page chips follow `display.header`. Index chips are the view switcher.


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
