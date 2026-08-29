---
title: Components
categories:
  - development
tags:
  - components
  - react
  - customization
components: 10
related:
  - title: Styling
    url: /features/styling
  - title: Metadata Display
    url: /features/metadata
  - title: Configuration
    url: /configuration
version: 0.2
status: stable
---

# Components

All UI components live in `components/`. They are wired into the site via `theme.config.jsx`
and styled in `styles/global.css`. Page-level chrome is driven by `display` in
`mndsite.yaml` — no MDX imports required.


## Current components

| Component | File | Where rendered |
|-----------|------|----------------|
| `Breadcrumbs` | `Breadcrumbs.jsx` | Above page title — `display.crumbs` |
| `PageHeader` | `PageHeader.jsx` | Under title — date and reading time from `display.header` |
| `TagList` | `TagList.jsx` | Under `PageHeader` — facet chips from `display.header` |
| `PageContents` | `PageContents.jsx` | Right sidebar (`display.toc`) and inline panel (`display.contents`) |
| `ContentsToggle` / `ContentsPanel` | `ContentsMenu.jsx` | Contents button and inline panel below the title |
| `Chip` | `Chip.jsx` | Used by `TagList` — class `chip-{facetName}` |
| `SiteFooter` | `SiteFooter.jsx` | Site-wide footer |
| `GitHubLink` | `GitHubLink.jsx` | Navbar — `display.navbar` includes `github` |
| `ThemeToggle` | `ThemeToggle.jsx` | Navbar — `display.navbar` includes `theme` |
| `FeedLink` | `FeedLink.jsx` | Navbar — `display.navbar` includes `feed` |
| `AutoRedirect` | `AutoRedirect.jsx` | Generated directory landing pages only |


## Component reference

### Breadcrumbs

Renders a linked trail above the page title. `home` roots at `/`; `path` adds ancestor
directories. The current page is the heading below — the trail never repeats it.
Returns null when `display.crumbs` is empty.

### PageHeader

Renders publication date and reading time on one line when listed in `display.header`.
Returns null when neither value is present.

### TagList

Renders facet values as chips below `PageHeader`. Each chip uses class `chip-{facetName}`
with colors generated from the facet's configured hue. Undeclared facet groups fall back to
`chip-custom`. Returns null when the chip list is empty.

### PageContents

Renders the sidebar body in `display.toc` order: **Description**, **On This Page**
(sections), **Related**, **Edit this page**. Each block appears only when it has content
and is listed in the order. Related merges resolved internal links, external http(s) links,
and frontmatter `related` entries. Edit links require `repo_url` and point at the source
file in the repository (`page.source` + `edit` config).

At ≥ xl, Nextra may own the section heading list when `sections` is listed in `display.toc`;
`TocTitle`, `TocExtra`, and `TocHeading` in `theme.config.jsx` adapt to that split.

### ContentsMenu

Below xl, Nextra hides the right sidebar. `ContentsToggle` opens `ContentsPanel`, which
renders the same `PageContents` body inline using `display.contents`. The toggle hides
itself when there is nothing to list. Escape and route changes dismiss the panel.

### SiteFooter

Renders the site-wide footer: copyright year, build timestamp, and credits.
**Edit `components/SiteFooter.jsx` directly** to customize footer content across all pages.

### GitHubLink / ThemeToggle / FeedLink

Navbar icons rendered when their token appears in `display.navbar`. Each returns null when
its prerequisite is missing (`repo_url` for GitHub, `feed_url` for feed). Nextra's built-in
dark-mode toggle is disabled — the theme toggle is only the navbar control.


## Consumer components

Point `components:` in `mndsite.yaml` at a directory of your React components.
Each build mirrors them into `components/custom/` where MDX pages can import them:

```yaml
components: ./my-components
```

```mdx
import Widget from '../components/custom/Widget'

<Widget />
```


## Adding a new component

**1.** Create the component file under `components/`.

**2.** Add styles to `styles/global.css` using `--site-*` variables where colors should
adapt to theme — see [Styling](/features/styling).

**3.** Wire into `theme.config.jsx` for site-wide use, or import from MDX / the `components:`
config path for page-local use.

**4.** Read page metadata via `useSection()` from `SectionContext`, or the page index built
from `site-meta.json` in `theme.config.jsx`.


## Planned components

| Component | Purpose |
|-----------|---------|
| `SemanticSearch` | Full-text and semantic search (index supplied by upstream pipeline) |
| Facet sidebar indexes | Left-nav chips from `facets.*.index`; Pages is built-in |

Site-wide colors, fonts, and chip hues are already configurable via `theme` and `facets` in
`mndsite.yaml` — see [Configuration](/configuration).
