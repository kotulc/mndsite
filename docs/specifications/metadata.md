---
title: Metadata Contract
categories:
  - spec
---

# Metadata Contract

`public/site-meta.json` is a **flat list of pages** produced by mndsite ingest. There is
no folder/root graph in this file. Optional enrichment (hashing, external NLP, graph
tools) lives in the sibling **mndmeta** project.

```json
{
  "pages": [
    {
      "url": "/configuration",
      "name": "Configuration",
      "slug": "configuration",
      "published": "2026-01-15",
      "created": "2026-01-10",
      "desc": null,
      "metrics": { "word_count": 1200, "reading_time": 6 },
      "links": ["/features/metadata"],
      "related": [
        { "name": "Site Configuration", "url": "/specifications/site-configuration", "score": 0.63 }
      ],
      "tags": [
        { "term": "yaml", "score": 0.91, "group": "user" },
        { "term": "extract", "score": 0.74, "group": "concept" }
      ],
      "sections": [
        {
          "name": "Extraction",
          "level": 2,
          "tags": [{ "term": "keywords", "score": 0.8, "group": "topic" }],
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
| `score` | Similarity of the term to the page/section **title** (0–1), via local embeddings |
| `group` | One of the fixed groups. Frontmatter tags always use `user` (still scored). Auto tags are assigned by embedding similarity to group-label prompts |

Embeddings use **Xenova/all-MiniLM-L6-v2** vendored at `models/Xenova/all-MiniLM-L6-v2/` (quantized ONNX +
tokenizer files). Ingest loads from disk only — no Hugging Face download.

### Tagging pipeline

For each page and each section (always on during ingest):

1. **Extract** a frequency-ranked unigram/bigram pool from the unit body (oversampled to
   `meta.max_keywords × 3` so later filters still leave enough candidates)
2. **Filter candidates** before embedding / selection:
   - Drop any term that shares a content word (or light stem) with the unit **title/header**
     — e.g. title “What the pipeline does” cannot yield tag `pipeline`
   - Drop terms that conflict with reserved frontmatter/`user` tags (exact, shared stem, or
     long substring — so FM `yaml` blocks auto `yaml config`)
   - Among remaining candidates (still frequency-ordered), keep the first of each conflict
     cluster — plurals/stems (`file`/`files`), shared tokens across bigrams, and long
     substrings (`config`/`configuration`) collapse to one survivor
3. Cap the filtered pool to `meta.max_keywords`
4. **Embed** title, group-label prompts, user terms, and filtered auto terms
5. **Score** each term against the title; assign auto terms to a group; force FM tags to `user`
6. Drop auto tags below `meta.min_relevance` (default `0.2`); user/FM tags are always kept
7. Merge **user first**, then auto by descending score; store up to `max_keywords`
8. UI shows the first `meta.page_tags` on the page, and up to `meta.section_tags` per section

Hover tooltips read `{Group} tag: relevance {score}` with score rounded to hundredths.

Frontmatter:

```yaml
title: My Page
date: 2026-01-15
desc: Optional summary for Page intelligence
tags: [yaml, extract]
```

`desc` / `description` is optional — PageInfo Summary is omitted when absent.

## Links

`links` are outbound references extracted at ingest for the Related sidebar:

1. Fenced code blocks are ignored (example `repo_url:` values never become Related links)
2. Only markdown links `[text](href)` are collected — not bare URLs
3. Fragment-only (`#theme`), `mailto:`, `tel:`, and `javascript:` are skipped
4. Internal paths keep the path only (`/page#section` → `/page`)
5. External `http(s)` URLs from intentional markdown links are kept

## Related

After tagging, each page gets up to `meta.related_links` related pages via embedding
similarity of a short fingerprint (`title` + optional `desc` + top tag terms). Entries
are `{ name, url, score }`. Pages already listed in `links` are skipped.

In the UI, Related shows resolved internal `links` (by page name), intentional external
links (by hostname), then embedding `related` pages.

```yaml
meta:
  max_keywords: 32
  page_tags: 5
  section_tags: 8
  related_links: 3
  min_relevance: 0.2
```