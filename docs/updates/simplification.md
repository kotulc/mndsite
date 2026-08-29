---
version: 0.2
status: deprecated
---

# mndsite renderer simplification plan

## Status and authority

This is the implementation plan for simplifying mndsite into the rendering and
static-build stage of the mndmap publishing pipeline.

`docs/archive.md` retains prior plans and history. Where older documentation
describes automatic local tagging or content enrichment inside mndsite, this
plan is authoritative.

## Product contract

mndsite is a portable static site renderer for publication-ready Markdown and
MDX.

Its input is normally the destination emitted by mndmap:

```text
source Markdown/MDX
  -> mndmap
  -> enriched and organized Markdown/MDX
  -> mndsite
  -> static website
```

mndsite:

- reads a configured content directory;
- mirrors that document tree into its framework content tree;
- reads manual and mndmap-owned frontmatter;
- derives renderer metadata required by the Next.js/Nextra application;
- renders navigation, page metadata, feeds, and custom components;
- builds a static site; and
- remains usable as a Docker/CI build step.

mndsite does not:

- extract semantic keywords;
- run embedding models;
- generate tags or categories;
- score related pages;
- reorganize pages or folders;
- rewrite content according to a second organization policy; or
- require mndmap runtime state.

Raw Markdown remains technically acceptable when it already satisfies the
input contract, but enrichment and organization belong upstream.

## Boundary with mndmap

The handoff is a directory of ordinary Markdown/MDX documents and assets.
There is no required SQLite database, organization manifest, graph file, or
mndmap-specific metadata sidecar.

mndmap owns:

- source parsing and structural identity;
- file, folder, group, page, and section organization;
- destination-only segment overrides;
- output paths and sibling order;
- generated folder/group landing pages;
- internal link and MDX reference rewriting;
- local asset collection and rewriting;
- inline mndflow diagrams;
- future Taggly enrichment; and
- atomic destination replacement.

mndsite owns:

- Markdown/MDX integration with Next.js and Nextra;
- static route rendering;
- navigation UI;
- metadata presentation;
- theme and custom components;
- feeds derived from supplied metadata;
- base-path handling;
- static export;
- Docker packaging; and
- deployment adapters and documentation.

## Input contract

### Directory structure

- The configured content root is the site route tree.
- `index.md` or `index.mdx` is the landing page for its directory.
- Every generated mndmap folder/group has an ordinary index document.
- mndsite does not flatten, regroup, or rename supplied paths.
- File-system routes must match mndmap route calculations exactly.

### Frontmatter

mndsite preserves and renders supplied frontmatter. Initial supported fields
include:

```yaml
title: Page title
description: Optional description
reading_time: 4
date: 2026-08-25
tags: [manual, tags]
categories: [manual, categories]
```

Rules:

- Existing manual metadata remains valid.
- mndmap may fill missing `description` and `reading_time` but does not
  overwrite supplied values.
- Generated descriptions use the first non-heading prose paragraph, normalized
  and length-capped.
- Generated reading time uses plain-text words divided by 200, rounded up, with
  a minimum of one minute.
- Tags and categories are rendered but never synthesized by mndsite.
- Reading time is displayed only when supplied.
- Future Taggly fields must arrive through frontmatter and be versioned before
  mndsite consumes them.
- Unknown frontmatter is preserved and made available to MDX/theme components.

### Content and assets

- Markdown and MDX content is treated as publication-ready.
- Inline SVG emitted by mndmap is preserved.
- Diagram SVG appears after introductory prose and before child links or page
  sections; mndsite does not reposition it.
- Complete mndflow graph JSON is not part of the handoff.
- Internal links and local asset references are not semantically redirected by
  mndsite.
- mndmap's `_assets/` tree is copied into the static output without changing its
  relative contract.
- Static MDX imports supported by the build are preserved.
- mndsite may perform framework-required `.md` to `.mdx` adaptation, but that
  adaptation must not change document meaning, routes, headings, or metadata.

## Configuration contract

`mndsite.yaml` remains focused on rendering and deployment:

```yaml
title: My Site
description: ""
repo_url: ""

content: .
output: ./dist

nav_order: {}

theme_toggle: navbar
toc: true

theme:
  color: default
  typeset: sans
  navbar: ""
  footer: ""
```

Remove enrichment configuration:

```text
meta.max_keywords
meta.page_tags
meta.section_tags
meta.related_links
meta.min_relevance
```

Remove organization configuration that conflicts with mndmap output:

```text
flatten
```

`nav_order` remains the cross-page navigation contract. mndmap replaces it in
the emitted destination config from physical organization and sibling
positions. mndsite honors it without applying a second organization policy.

The destination-root `mndsite.yaml` is produced with this precedence:

1. an explicitly configured mndmap template;
2. workspace-root `mndsite.yaml`;
3. mndsite defaults.

mndmap owns `content` and `nav_order`. It preserves user identity, theme,
output, deployment, and unknown supported fields.

`BASE_PATH` remains an environment/build concern.

## Ingest contract

The simplified ingest step:

1. validates the configured content root;
2. clears generated framework content and static-asset targets;
3. recursively mirrors Markdown and MDX;
4. preserves frontmatter and body content;
5. copies `_assets/` and other explicitly supported static files;
6. generates framework navigation metadata from directory structure and
   `nav_order`;
7. extracts only the metadata required by renderer components;
8. creates framework-required redirect/index files only when the input
   contract explicitly permits it; and
9. returns deterministic diagnostics.

It must not call keyword extraction, embedding, tag grouping, or related-page
scoring.

Generated framework files remain internal build artifacts and are not part of
the mndmap/mndsite handoff.

## Metadata presentation

Renderer components may continue to show:

- page title and description;
- date and supplied reading time;
- tags and categories;
- outbound links;
- explicitly supplied related links;
- section information derived from headings; and
- feed entries derived from supplied date/category/tag metadata.

The internal `site-meta.json` file may remain as a renderer optimization, but:

- it is derived only from input documents and frontmatter;
- it is not an enrichment authority;
- it contains no locally generated semantic tags or similarity scores; and
- its schema is tested against representative mndmap output.

Components must handle absent optional metadata without placeholder or broken
UI.

## Navigation

- Directory structure defines hierarchy.
- Generated `nav_order` maps define sibling order.
- `index` remains the directory landing route.
- Paths omitted from `nav_order` use deterministic slug ordering after listed
  entries.
- Generated mndmap landing pages appear as ordinary pages.
- Folder navigation labels come from landing-page title when present, then a
  deterministic slug-to-title fallback.

## CLI and Docker

The supported build remains:

```sh
mndsite build --config mndsite.yaml
```

The CLI:

- validates configuration and input before deleting generated framework state;
- mirrors content;
- runs the Next.js/Nextra static build;
- exits with the underlying failure status; and
- writes only to configured/generated mndsite targets.

The Docker image:

- contains no vendored embedding model;
- contains no transformer runtime required only for enrichment;
- accepts a mounted mndmap destination as `content`;
- writes the static site to `output`; and
- remains reproducible from a pinned image tag.

## Delivery stages

### M0 — Pin the cross-project contract

- pin the mndmap revision and representative emitted fixture;
- document routes, anchors, `nav_order`, metadata, `_assets/`, MDX, and inline
  SVG;
- add a fixture contract test before deleting old behavior.

Exit: current mndsite can ingest the fixture far enough to expose every
incompatibility explicitly.

### M1 — Remove local semantic enrichment

- remove `scripts/tags.js`;
- remove keyword, group, and related-page generation from `scripts/meta.js` and
  `scripts/ingest.js`;
- remove `@xenova/transformers`;
- remove the vendored MiniLM model;
- remove enrichment config and tests;
- retain rendering of supplied tags and categories.

Exit: install and ingest require no model, transformer runtime, or semantic
scoring.

### M2 — Make ingest a faithful adapter

- preserve supplied frontmatter and Markdown/MDX bodies;
- mirror the route tree without flattening or regrouping;
- sort navigation from generated or user-supplied `nav_order`;
- copy `_assets/` faithfully;
- preserve inline SVG and supported static MDX imports;
- remove duplicate link/image semantic rewriting now owned by mndmap.

Exit: mndsite's built routes, headings, links, and assets match the mndmap
fixture contract.

### M3 — Adapt renderer metadata

- derive internal renderer metadata from supplied frontmatter;
- update PageHeader, TagList, PageContents, Breadcrumbs, and ContentsMenu integrations;
- make optional fields safe;
- remove assumptions that tags or related links always exist.

Exit: manual metadata renders correctly and documents with no enrichment render
without degraded layout.

### M4 — Simplify configuration and documentation

- remove `meta` and `flatten`; retain `nav_order` as the upstream navigation
  contract;
- update `README.md`, configuration docs, examples, Docker docs, and workflows;
- show `mndmap build` as the recommended upstream step;
- keep standalone raw-input behavior within the publication-ready contract.

Exit: documented configuration contains only rendering, content, output,
theme, and deployment concerns.

### M5 — Cross-project verification and release

- build the pinned mndmap fixture locally and in Docker;
- verify pages, folders, `nav_order`, tags, categories, assets, MDX, feeds,
  inline diagrams, routes, and anchors;
- compare clean-checkout image size and build time after model removal;
- publish a pinned mndsite image supported by mndmap.

Exit: `mndmap build -> mndsite build` succeeds on clean Linux and Windows
workflows and produces the expected static site.

## Test plan

### Unit

- config rejects removed enrichment and flattening keys with migration help;
- frontmatter parsing and preservation;
- deterministic `nav_order` sorting;
- folder title fallback;
- metadata extraction without generation;
- optional tag/category/related fields;
- `_assets/` path preservation;
- route and anchor parity.

### Integration

- ingest representative mndmap Markdown and MDX;
- preserve inline SVG;
- preserve links already rewritten by mndmap;
- copy assets without a second path policy;
- build nested folders and generated landing pages;
- render with and without optional metadata;
- build under `BASE_PATH`;
- verify static export.

### Cross-project fixture

The shared fixture includes:

- non-default mndmap source and destination names;
- nested folders and generated groups;
- ordered sibling pages;
- moved sections and destination-only overrides;
- manual tags, categories, date, and description;
- Markdown links to moved pages and headings;
- images and non-image assets;
- static MDX imports;
- generated landing and opt-in page diagrams; and
- duplicate-title cases that prove route and anchor diagnostics occur upstream.

## Migration and compatibility

This is an intentional responsibility change:

- mndsite configurations using `meta` or `flatten` are rejected with migration
  guidance.
- callers move organization into mndmap and metadata into source/frontmatter.
- automatic local tags and related links disappear until a future Taggly
  integration emits them upstream.
- no compatibility shim runs the old enrichment path.

The last image supporting local semantic enrichment remains pinned and
documented for users who need a transition period.

## Definition of done

mndsite simplification is complete when:

1. mndsite installs and builds without transformers or a vendored model.
2. It performs no automatic tagging, grouping, or related-page scoring.
3. It preserves the route tree, `nav_order`, content, frontmatter, links,
   assets, MDX, and inline diagrams supplied by mndmap.
4. Renderer components display supplied metadata and tolerate its absence.
5. Configuration contains no competing organization or enrichment policy.
6. The Docker image consumes a mndmap destination and produces the expected
   static site.
7. Shared cross-project fixtures pass on clean checkouts.
