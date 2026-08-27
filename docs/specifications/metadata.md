---
title: Metadata Contract
categories:
  - spec
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
      "tags": [
        { "term": "yaml", "group": "user" },
        { "term": "guide", "group": "category" }
      ],
      "sections": [
        {
          "name": "Fields",
          "level": 2,
          "tags": [],
          "sections": []
        }
      ]
    }
  ]
}
```

## Tags

Fixed group vocabulary: **`category`**, **`topic`**, **`concept`**, **`entity`**, **`user`**.

| Field | Meaning |
|-------|---------|
| `term` | Display string |
| `group` | One of the fixed groups |

Tag sources at ingest:

- frontmatter `tags` → group `user`
- frontmatter `categories` → group `category`
- section `tags` → always `[]` (no local section tagging)

Future upstream enrichment (Taggly) must arrive through frontmatter and be versioned before mndsite consumes additional groups or scores.

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

`sections` mirror the heading tree extracted from page body text. Section records carry `name`, `level`, and empty `tags` arrays. PageInfo uses them for the Sections mosaic and in-page anchor links.
