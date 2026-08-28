---
title: Styling
categories:
  - features
tags:
  - css
  - theming
  - nextra
components: 2
related:
  - title: Features Overview
    url: /features
  - title: Metadata Display
    url: /features/metadata
  - title: Configuration
    url: /configuration
---

# Styling

Custom styles are written in plain CSS. No Tailwind configuration is needed —
Nextra uses Tailwind internally with its own prefix, so adding Tailwind to the
project would create conflicts.

## Where styles live

| File | Purpose |
|------|---------|
| `styles/global.css` | All custom CSS for this project |
| `_app.jsx` | Root-level Next.js app wrapper; imports `global.css` |
| `pages/_app.jsx` | Auto-copied from `_app.jsx` by `ingest.js` on each run |

`_app.jsx` at the project root is the canonical source. The ingest pipeline
copies it into `pages/` automatically, so edits to `_app.jsx` are preserved
across ingest runs. Do not edit `pages/_app.jsx` directly.

## Site CSS variables

`styles/global.css` defines a set of `--site-*` design tokens at the top of the
file. They adapt to light/dark mode automatically, and the primary shades derive
from the `theme.color` palette configured in `mndsite.yaml`:

```css
/* Gray scale */
--site-gray-100   /* very light background tint */
--site-gray-200   /* borders and dividers */
--site-gray-400   /* disabled / placeholder */
--site-gray-500   /* secondary text */
--site-gray-600   /* body text */
--site-gray-900   /* headings */

/* Primary accent — follows theme.color */
--site-primary-100  /* light accent background */
--site-primary-600  /* link color */
--site-primary-700  /* link hover */
```

Use these variables in `global.css` instead of hardcoding colors so that light
mode, dark mode, and the configured palette all work automatically:

```css
/* Good — adapts to theme */
.my-element { color: var(--site-gray-600); }

/* Avoid — breaks dark mode and ignores theme.color */
.my-element { color: #4b5563; }
```

## Nextra's internal Tailwind

Nextra bundles Tailwind and applies it with an `nx-` prefix on its own elements
(e.g. `nx-text-gray-500`, `nx-flex`). These are Nextra-internal and should not
be added to your own components. To override Nextra element styles, target the
semantic class names Nextra exposes instead:

```css
/* Nextra's search input */
.nextra-search input { border-radius: 0.5rem; }

/* Nextra's sidebar */
.nextra-sidebar { font-size: 0.875rem; }

/* Nextra's content wrapper */
.nextra-content { max-width: 52rem; }
```

Inspect the rendered HTML with browser DevTools to find the correct selector.
Prefer scoped overrides over broad element resets to avoid breaking Nextra's
built-in styles.

## Adding custom styles

1. Open `styles/global.css` and add your CSS at the end.
2. Use `--site-*` variables for any color that should adapt to dark mode.
3. Restart the dev server (`npm run dev`) if a newly added class does not apply —
   Next.js hot-reloads JS but occasionally misses CSS-only changes.

## Page layout structure

The custom h1 (`PageTitle` in `theme.config.jsx`) wraps the page chrome:

```
Nextra layout
├── Left nav (Nextra)
├── main
│   ├── Breadcrumbs + Contents toggle     (display.crumbs, display.contents)
│   ├── h1 + PageMeta                     (display.header)
│   ├── ContentsPanel (inline, < xl)      (display.contents)
│   └── page MDX body
└── Right TOC column (Nextra, ≥ xl)
    ├── Description (TocTitle) + Nextra heading list (when sections listed)
    └── PageContents tail                   (Related, Edit — display.toc)
```

When `sections` is omitted from `display.toc`, `PageContents` renders the entire sidebar.
When it is listed, Nextra owns the heading list and scroll-spy; `PageContents` fills the
description slot and the tail below Nextra's headings.

The `.page-contents-*`, `.contents-*`, `.page-crumbs`, and `.panel-label` classes in
`global.css` style these regions. Nextra pins the right column sticky with its own
scrollbar — that default is preserved.

## Chips

Facet values render as rectangular chips via `TagList` and the shared `Chip` component.
Each declared facet gets a generated `.chip-{facetName}` color pair in `theme.config.jsx`
(from the facet's configured hue). Undeclared facet groups use `.chip-custom`. The neutral
`.chip-tag` and destructive `.chip-danger` variants remain for generic Chip use.

To change chip appearance, edit the generated facet rules in `theme.config.jsx` (via
`chip_rules`) or override `.chip`, `.chip-custom`, `.chip-tag`, and `.chip-danger` in
`styles/global.css`.
