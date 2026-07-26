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
from the `theme.color` palette configured in `mdsite.yaml`:

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

The `main` key in `theme.config.jsx` wraps only the page content area. Nextra
renders the left nav and right TOC column outside of `main`, so no custom flex
layout is needed.

Consumer components can render in Nextra's right TOC column via `toc.extraContent`
in `theme.config.jsx` — mdsite uses this slot for `MetaSidebar` (see
[Metadata Display](/features/metadata)):

```
Nextra layout
├── Left nav (Nextra)
├── main  →  page title + Info/Contents actions + PageMeta + optional PageInfo/TocMenu panels + page content
└── Right TOC column (Nextra, ≥ xl)
    ├── "On This Page" heading list
    └── toc.extraContent  →  MetaSidebar (Related, Edit this page)
```

The `.meta-sidebar-*` and `.panel-label` classes in `global.css` style components
placed in this column and in the inline Info/Contents panels. Nextra pins this whole
column sticky near the top of the viewport by default, with its own capped-height
scrollbar independent of the page's own scroll — that default is left in place so the
"On This Page" heading list and Related links stay fixed while the body scrolls.

## Chips

Extracted tags, categories, keywords, and filter/action chips render as rectangular
chips via the shared `Chip` component. Variants:

| Class | Color | Used for |
|-------|-------|---------|
| `.chip.chip-categories` / `.chip-topics` / `.chip-concepts` / `.chip-entities` | One fixed color per standard group | `TagList` chips (every group except `keywords`) |
| `.chip.chip-custom` | Fixed fallback color | Any `extract_concepts` group outside the standard four |
| `.chip.chip-tag` | Gray | Default Chip variant / keyword-style chips |
| `.chip.chip-danger` | Red | Destructive-action chips (filters, per-entry actions) |

`TagList` maps each tag group name straight to its chip variant (`categories` →
`chip-categories`, etc., `chip-custom` for anything else) — plain class selectors, no
inline color computation, so the same rule works in both light and dark mode via the
`:is(html[class~="dark"])` overrides already established for `.chip-tag`/`.chip-danger`.

To change chip appearance, edit the `.chip`, `.chip-categories`/`.chip-topics`/
`.chip-concepts`/`.chip-entities`/`.chip-custom`, `.chip-tag`, and `.chip-danger` rules
in `styles/global.css`.
