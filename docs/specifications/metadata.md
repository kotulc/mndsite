---
title: Metadata Contract
categories:
  - spec
version: 0.2
status: stable
---

# Metadata Contract

`public/site-meta.json` is a **flat list of pages** produced by mndsite ingest from supplied frontmatter and page content. There is no folder/root graph in this file.

mndsite does **not** generate semantic tags or embedding-based related links. Enrichment belongs upstream in **mndmap** (or manual frontmatter). Optional graph tooling lives in the sibling **mndmeta** project.

```json
{
  "pages": [
    {
      "url": "/configuration",
      "name": "Configuration",
      "slug": "configuration",
      "published": "2026-01-15",
      "created": "2026-01-10",
      "desc": "Optional summary from frontmatter",
      "metrics": { "word_count": 1200, "reading_time": 6 },
      "links": ["/features/metadata"],
      "related": [
        { "name": "Getting Started", "url": "/getting-started" }
      ],
      "identity": "mndmap-0042",
      "source": "configuration.md",
      "facets": {
        "categories": ["guide"],
        "tags": ["yaml", "markdown"]
      },
      "sections": [
        {
          "name": "Fields",
          "level": 2,
          "sections": []
        }
      ]
    }
  ]
}
```

## Facets

`facets` holds one entry per declared content dimension, keyed by facet name. There is no
fixed vocabulary — `mndsite.yaml` `facets` decides which frontmatter fields are read and what
each is called. Values keep their supplied shape: a list stays a list, a scalar stays a scalar.

| Rule | Behavior |
|-------|---------|
| Undeclared frontmatter field | Ignored — never appears in `facets` |
| Value outside the facet's `values` list | Dropped |
| Field absent from a page | Facet omitted for that page |
| Sections | Carry no facet values (no local section tagging) |

`identity` is the frontmatter id (default key `doc_id`) that groups variants of the same
document — the basis for version selection and rollup. It is `""` when upstream supplies none.

`source` is the ingested file's path relative to the content root, keeping its original
extension (`index.md`, not the emitted `index.mdx`). It exists so "Edit this page" can point
at the repo copy of that file, and is unused when `repo_url` is not set.

Future upstream enrichment (Taggly) must arrive through frontmatter and be declared as a
facet before mndsite renders it.

Frontmatter:

```yaml
title: My Page
date: 2026-01-15
desc: Optional summary for Page intelligence
reading_time: 4
tags: [yaml, markdown]
categories: [guide]
related:
  - title: Configuration
    url: /configuration
```

## Links

`links` are outbound markdown link targets extracted from page content for the Related sidebar:

1. Fenced code blocks are ignored
2. Only markdown links `[text](href)` are collected
3. Fragment-only, `mailto:`, `tel:`, and `javascript:` are skipped
4. Internal paths keep the path only (`/page#section` → `/page`)
5. External `http(s)` URLs from intentional markdown links are kept

## Related

`related` comes from frontmatter only:

```yaml
related:
  - title: Other Page
    url: /other-page
  - /bare/url/string
```

Each entry becomes `{ name, url }`. No embedding similarity scoring.

In the UI, Related shows resolved internal `links` (by page name), intentional external links (by hostname), then frontmatter `related` entries.

## Metrics

| Field | Source |
|-------|--------|
| `metrics.word_count` | Computed from page body text at ingest |
| `metrics.reading_time` | frontmatter `reading_time` when present; omitted otherwise |

mndmap may fill missing `reading_time` upstream (words ÷ 200, minimum 1 minute). mndsite does not compute or inject reading time locally.

## Sections

`sections` mirror the heading tree extracted from page body text. Section records carry
`name`, `level`, and nested `sections`. `PageContents` uses them for the **On This Page**
list and in-page anchor links.
