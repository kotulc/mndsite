---
title: Components
categories:
  - development
tags:
  - components
  - react
  - customization
components: 8
related:
  - title: Styling
    url: /features/styling
  - title: Metadata Display
    url: /features/metadata
  - title: Configuration
    url: /configuration
---

# Components

All UI components live in `components/`. They are wired into the site via `theme.config.jsx`
and styled in `styles/global.css`. No imports are needed inside markdown for page-level metadata — components that appear on every page are registered globally in `theme.config.jsx`.


## Current components

| Component | File | Where rendered |
|-----------|------|----------------|
| `PageHeader` | `PageHeader.jsx` | Below page title — date and reading time |
| `TagList` | `TagList.jsx` | Below `PageHeader` — frontmatter tag chips |
| `PageInfo` | `PageInfo.jsx` | Info toggle + expandable Summary / Sections panel |
| `TocMenu` | `TocMenu.jsx` | Contents toggle + inline Sections + MetaSidebar (below `xl`) |
| `MetaSidebar` | `MetaSidebar.jsx` | Right ToC (and TocMenu) — Related + Edit |
| `Chip` | `Chip.jsx` | Used by TagList |
| `SiteFooter` | `SiteFooter.jsx` | Site-wide footer |
| `GitHubLink` | `GitHubLink.jsx` | Navbar — circular GitHub icon |
| `ThemeToggle` | `ThemeToggle.jsx` | Navbar — light/dark/system toggle |
| `FeedLink` | `FeedLink.jsx` | Navbar — links to `feed_url` section when configured |


## Component reference

### PageHeader

Renders publication date and reading time on a single line below the page title.
Returns `null` when neither value is present in `site-meta.json`.

Props: `date` (YYYY-MM-DD string), `reading_time` (integer minutes).

### TagList

Renders frontmatter tags and categories as chips below `PageHeader`.
Returns `null` when the tag list is empty.

Props: `tags` — array of `{ term, group }` objects.

### SiteFooter

Renders the site-wide footer: copyright year, build timestamp, and credits.
**Edit `components/SiteFooter.jsx` directly** to customize footer content across all pages.

### GitHubLink

Circular GitHub mark icon in the navbar. Returns `null` when `repo_url` is empty in
`mndsite.yaml`. No props — reads config directly.

### ThemeToggle

Cycles through system → light → dark using `useTheme()` from `next-themes`.
Shown in the navbar when `display.navbar` lists `theme` in `mndsite.yaml`; otherwise
Nextra's built-in sidebar toggle is used.

### FeedLink

Navbar icon linking to the section slug configured in `feed_url`. Hidden when `feed_url` is empty.


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

**1. Create the component file**

```jsx
// components/MyWidget.jsx
/** One-line description of what this component does. */
export default function MyWidget({ label }) {
  return <div className="my-widget">{label}</div>
}
```

**2. Add CSS**

Add styles to `styles/global.css`. Use `--site-*` variables for theme-adaptive
colors. See [Styling](/features/styling) for details.

**3. Wire into theme.config.jsx**

For components that appear on every page, import them in `theme.config.jsx` and add
them to the `main` layout or `navbar.extraContent`.

For components used only on specific pages, import them directly inside the `.mdx` file
or register them via the `components:` config path above.

**4. Access page metadata (optional)**

Use `useSection()` from `SectionContext` or the site metadata index in `theme.config.jsx`
to read the current page record from `site-meta.json`.


## Planned components

| Component | Purpose |
|-----------|---------|
| `SemanticSearch` | Full-text and semantic search (index supplied by upstream pipeline) |
| `ThemeGenerator` | Derives palette from upstream content-style signals |

These are Phase 2 features. Site-wide colors and fonts are already configurable today
via the `theme` block in `mndsite.yaml` — see [Configuration](/configuration).
