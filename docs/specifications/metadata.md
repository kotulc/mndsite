---
title: Metadata Contract
categories:
  - spec
---

# Metadata Contract

`public/site-meta.json` is a **flat list of pages** produced by mdsite ingest. There is
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
      "related": [],
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

Pipeline (always on during ingest):

1. Extract up to `tags.max_keywords` candidates from the unit text
2. Score candidates (and frontmatter tags) against the unit title
3. Group auto candidates; force FM tags to `user`
4. Merge **user first**, then auto by descending score; store up to `max_keywords`
5. UI shows the first `tags.page_tags` entries

Frontmatter:

```yaml
title: My Page
date: 2026-01-15
desc: Optional summary for Page intelligence
tags: [yaml, extract]
```

`desc` / `description` is optional — PageInfo Summary is omitted when absent.

## Related

After tagging, each page gets up to `tags.top_n_related` related pages via embedding
similarity of a short fingerprint (`title` + optional `desc` + top tag terms). Entries
are `{ name, url, score }`. Pages already listed in `links` are skipped.

```yaml
tags:
  max_keywords: 32
  page_tags: 5
  top_n_related: 3
```