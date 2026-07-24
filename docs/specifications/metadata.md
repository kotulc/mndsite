---
title: Metadata Contract
categories:
  - spec
---

# Metadata Contract

Defines the site graph — `public/site-meta.json` — the single data structure that every
metadata-driven component reads. The graph mirrors the content directory as a tree of
**folder**, **page**, and **section** nodes. Structural fields are always present;
NLP fields are added when [extraction](#extraction) is enabled. Frontmatter is optional
input, converted into node fields and stripped from the generated pages.

## Node types

Every node has at minimum `name` and `children`. `name` on the root is the site title.

### root
```json
{ "name": "<site title>", "type": "root", "url": "/", "children": [ <page|folder> ] }
```

### folder
```json
{ "name": "Features", "type": "folder", "url": "/features", "slug": "features",
  "children": [ <page|folder> ] }
```

### page
```json
{
  "name": "Configuration", "type": "page", "url": "/configuration", "slug": "configuration",
  "date": "2026-01-15",        // publish date from frontmatter (empty when absent)
  "created": "2026-07-20",     // source file modification date
  "word_count": 906,
  "reading_time": 5,           // minutes at 200 wpm
  "links": ["/getting-started", "https://…"],   // markdown + bare URLs in content
  "content": "…",              // intro text before the first section heading
  "children": [ <section> ],

  // NLP fields (extraction only):
  "desc": "…", "concepts": [...], "topics": [...], "keywords": [...],
  "polarity": { "negative": 0.03, "neutral": 0.84, "positive": 0.02 },
  "spam": 0.31, "toxicity": 0.001,
  "related": [ { "name": "Deployment", "url": "/features/deployment", "score": 0.61 } ]
}
```

### section
```json
{
  "name": "Fields", "type": "section", "level": 2,
  "content": "…",              // this section's own text (before any subsection)
  "children": [ <section> ],   // nested ### subsections
  // NLP fields (extraction only): desc, concepts, topics, keywords, polarity, spam, toxicity
}
```

Sections nest by heading level: `##` = level 2 (top), `###` = level 3. Headings deeper
than `###` fold into their section's content. The page title (`#`) becomes the page
`name`; text before the first `##` is the page's `content`.

## Field sources (first match wins)

| Field | Source |
|-------|--------|
| `name` (page) | frontmatter `title` → first `#` heading → title-cased slug |
| `date` | frontmatter `date` (publish date) → empty |
| `created` | source file mtime |
| `word_count`, `reading_time`, `links`, `content` | derived from content |
| `desc`, `concepts`, `topics`, `keywords`, `polarity`, `spam`, `toxicity` | taggly (extraction) |
| `related` | taggly `/score` over page descriptions (extraction) |

## Bottom-up computation

NLP metadata is computed leaf-first and aggregated toward the page:

1. **Leaf nodes** (sections with no subsections, and each node's own `content`) are scored
   directly: `/tag` → concepts/topics/keywords, `/desc` → desc, `/polar`/`/spam`/`/tox` → scores.
2. **Parent nodes** (sections with subsections, and pages) aggregate the metadata of their
   own content plus their children:
   - **desc** = `/desc` of the combined child descriptions,
   - **concepts / topics / keywords** = union of children (deduped, first-seen order),
   - **polarity / spam / toxicity** = mean of children.

So a page's description summarizes its sections' descriptions, and its scores are the
average of its sections'.

## Related pages

After every page has a description, each page is compared against the others (up to
`max_comparisons`, default 128) via `/score` using the page descriptions. The
`top_n_related` (default 3) highest-scoring pages are attached as `related`, each with a
`name`, `url`, and similarity `score`.

## Access

`site-meta.json` is the graph (source of truth). The theme derives a flat `url → page`
index from it at load to render `PageHeader` (date, reading time), `TagList`
(topics/keywords chips), and the SEO description. Any component can fetch the graph at
`${basePath}/site-meta.json` and walk or index it.

## Extraction

NLP fields require `extract.url` in `mdsite.yaml` pointing at a running
[taggly](https://github.com/kotulc/taggly) instance, and run only when requested: the CLI
`--extract` flag per build, or `extract.on_build: true` for every build (including
`npm run ingest`, which reads `mdsite.yaml`). Without extraction the structural graph is
still written. When extraction is configured but not requested, the build logs that it was
skipped; when requested and the service is unreachable, the build fails by default
(`extract.strict: false` warns and skips).

taggly commands and their configurable parameters (all sent explicitly; override under
`extract.taggly` in `mdsite.yaml`):

| Command | Fields produced | Params (defaults) |
|---------|-----------------|-------------------|
| `/tag` | concepts, topics, keywords | `concepts`, `max_ngram=2`, `top_n=10`, `rank=false`, `score=false`, `normalize=true` |
| `/desc` | desc | — |
| `/polar` | polarity | — |
| `/spam` | spam | `threshold=0.5` |
| `/tox` | toxicity | `threshold=0.5` |
| `/score` | related | — (query + candidate descriptions) |

Metric inputs (`/polar`, `/spam`, `/tox`) are reduced to plain prose and capped at 1500
characters; `/tag` and `/desc` are capped at 8000 — taggly's classifier models reject
long inputs.

## Requirements

1. REQ-1: The structural graph (folders, pages, sections, word count, reading time, links, dates) is written on every ingest, with or without extraction
2. REQ-2: The graph mirrors the content directory; the root is a `root` node named after the site title
3. REQ-3: Sections nest `##` > `###`; deeper headings fold into content; the page title is not a section
4. REQ-4: Generated pages contain no frontmatter
5. REQ-5: With extraction, leaf nodes are scored directly and parents aggregate (desc re-summarized, tags unioned, scores averaged)
6. REQ-6: With extraction, each page gets up to `top_n_related` related pages by description similarity
7. REQ-7: All taggly parameters are configurable under `extract.taggly` and sent explicitly; unknown command names fail config loading

## Test Cases

- `test_site_meta_root_is_site_title`, `test_site_meta_mirrors_folders_and_pages` — REQ-1, REQ-2
- `test_section_tree_nests_by_level`, `test_section_tree_folds_deep_headings`, `test_build_page_strips_title_from_body` — REQ-3
- `test_pages_have_no_frontmatter` — REQ-4
- `test_extract_node_leaf_uses_own_content`, `test_extract_node_parent_aggregates_children`, `test_aggregate_unions_tags_and_means_scores` — REQ-5
- `test_compute_related_scores_and_ranks` — REQ-6
- `test_extract_taggly_params_override`, `test_extract_unknown_taggly_command_throws`, `test_taggly_sends_configured_params` — REQ-7
