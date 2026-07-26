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
{ "name": "<site title>", "type": "root", "url": "/", "children": [ <page|folder> ],
  "extract_config": "a1b2c3d4e5f6a7b8"   // hash of the extract config (extraction only)
}
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
  "published": "2026-01-15",   // publish date from frontmatter (empty when absent)
  "created": "2026-07-20",     // source file modification date
  "hash": "9f3a1c2e7b0d4f8a",  // content hash — used to skip re-extraction when unchanged
  "links": ["/getting-started", "https://…"],   // markdown + bare URLs in content
  "content": "…",              // intro text before the first section heading
  "children": [ <section> ],

  "metrics": {
    // structural (always present):
    "word_count": 906, "reading_time": 5,   // reading_time in minutes at 200 wpm

    // NLP (extraction only):
    "polarity": { "negative": 0.03, "neutral": 0.84, "positive": 0.02 },
    "spam": 0.31, "toxicity": 0.001
  },

  // NLP fields (extraction only):
  "tags": {
    "categories": ["reference"], "topics": ["configuration"], "concepts": ["yaml config"],
    "entities": ["taggly"], "keywords": ["extraction", "threshold", "..."]
  },
  "page_tags": {                // top extract.page_tags (default 5) non-keyword tags overall,
    "categories": ["reference"], "concepts": ["yaml config"]   // selected via /rank — see below
  },
  "desc": "…",                 // only with extract.extract_descriptions: true
  "updated": "2026-07-24T18:02:11.000Z",   // when tags/metrics were last (re)computed
  "related": [ { "name": "Deployment", "url": "/features/deployment", "score": 0.61 } ]
}
```

### section
```json
{
  "name": "Fields", "type": "section", "level": 2,
  "content": "…",              // this section's own text (before any subsection)
  "children": [ <section> ],   // nested ### subsections
  // NLP fields (extraction only): tags, metrics (polarity/spam/toxicity only —
  // sections don't carry word_count/reading_time, and never get a desc)
}
```

Sections nest by heading level: `##` = level 2 (top), `###` = level 3. Headings deeper
than `###` fold into their section's content. The page title (`#`) becomes the page
`name`; text before the first `##` is the page's `content`.

## Field sources (first match wins)

| Field | Source |
|-------|--------|
| `name` (page) | frontmatter `title` → first `#` heading → title-cased slug |
| `published` | frontmatter `date` → empty |
| `created` | source file mtime |
| `hash` | sha256 of the page's transformed content (structural, always computed) |
| `metrics.word_count`, `metrics.reading_time`, `links`, `content` | derived from content (structural, always computed; pages only) |
| `tags`, `metrics.polarity`/`.spam`/`.toxicity` | taggly `/ext`, `/ent`, `/key`, `/polar`, `/spam`, `/tox` (extraction) |
| `page_tags` (page only) | taggly `/rank` over `tags`, minus `keywords` and the page title (extraction) |
| `desc` | taggly `/desc` over the page's full text (extraction, opt-in, default on) |
| `updated` | timestamp of the last extraction that actually ran for this page |
| `related` | taggly `/score` over page descriptions (or tag terms, when no description) (extraction) |
| `extract_config` (root) | hash of the extract config as of the last extraction run |

## Bottom-up computation

`tags` and `metrics` are computed leaf-first and aggregated toward the page:

1. **Leaf nodes** (sections with no subsections, and each node's own `content`) are scored
   directly:
   - `/ext` → one array per configured concept group (`extract_concepts`, default
     `categories, topics, concepts`), each plain-sliced to `max_concepts` terms (`/ext`
     has no `top_n` parameter of its own)
   - `/ent` → entities, capped via taggly's native `top_n=max_entities`
   - `/key` → keywords, capped via taggly's native `top_n=max_keywords`
   - `/polar` / `/spam` / `/tox` → `metrics.polarity` / `.spam` / `.toxicity`, each
     individually gated by `score_polarity` / `score_toxicity` / `score_spam`
2. **Parent nodes** (sections with subsections, and pages) aggregate the tags/metrics of
   their own content plus their children:
   - **each tag group** = union of children (deduped, first-seen order), **then re-capped**
     to the same configured limit (`max_concepts`/`max_entities`/`max_keywords`) — a union
     of already-capped children can still exceed it,
   - **each metric** = mean of children.

So a page's tags are the union of its sections' tags (capped to the same size as a leaf's),
and its metric scores are the average of its sections'. `metrics` is merged, not replaced,
by this step — a page's structural `word_count`/`reading_time` (set before extraction ever
runs) survive alongside the added `polarity`/`spam`/`toxicity`.

`desc` is the one field that does **not** aggregate: with `extract.extract_descriptions:
true`, each page gets exactly one `/desc` call over its own full text (its `content` plus
every descendant section's `content`, concatenated) — sections never get a `desc`, and a
page's `desc` is not built from section descriptions.

## Page tags

Once a page's own `tags` are fully aggregated, `page_tags` is derived from them in one more
step — page-only, not aggregated from sections: every term across `tags`' non-`keywords`
groups is collected (deduped; a term identical to the page's own title, case-insensitive, is
dropped first — a concept that just restates the title isn't a useful tag), then ranked by
relevance to the page's own full text via `/rank` and cut to the top `page_tags` (default 5).
The result keeps each surviving term's original group, so it renders with the same
per-group chip coloring as `tags`. This curated set — not the full `tags` — is what renders
below the page title and, when no section is in view, in the ToC sidebar's "Tags" block.

## Related pages

After tags (and, when enabled, descriptions) are computed, each page is compared against
the others (up to `max_comparisons`, default 128) via `/score`. The comparison text is a
page's `desc` when `extract_descriptions` produced one, otherwise its combined tag terms —
`Object.values(page.tags).flat().join(', ')`. The `top_n_related` (default 3)
highest-scoring pages become `related`, each with a `name`, `url`, and similarity `score`.

## Change detection

Extraction is expensive, so pages are only re-extracted when their content actually
changed. Before each run, `ingest.js` reads the previous `public/site-meta.json` (if any)
into a `url → page node` map plus its `extract_config` hash. For every page:

- If the previous page's `hash` matches the freshly-built page's `hash`, **and** the
  extract config hasn't changed, its `tags`, `metrics`, `desc`, `page_tags`, and `updated`
  are copied forward unchanged — no taggly calls at all.
- Otherwise the page (and all its sections) is extracted fresh, and `updated` is set to
  the current time.

`related` is always recomputed for every page after this pass, since a page's peers may
have changed even when the page itself didn't.

Changing any of `extract_concepts`, `max_concepts`, `max_keywords`, `max_entities`,
`page_tags`, `score_polarity`, `score_toxicity`, `score_spam`, or `extract_descriptions`
changes the `extract_config` hash and invalidates the cache for **every** page on the next
run, since those settings affect what gets computed. `url`, `on_build`, `strict`,
`max_comparisons`, and `top_n_related` don't affect computed tags/metrics/desc, so changing
them alone doesn't force re-extraction.

## Access

`site-meta.json` is the graph (source of truth). The theme derives a flat `url → page`
index from it at load to render `PageHeader` (`published` date, `metrics.reading_time`),
`TagList` (`page_tags`, as page-level chips below the title), `SectionMarker` (an
invisible per-section scroll anchor injected after each heading — sections render no tags
of their own inline), and `MetaSidebar` (`desc`, tags — the active section's full `tags`,
or the page's own `page_tags` — plus `keywords` + `metrics`, `links`, `related`) — see
[Page Metadata](/specifications/page-metadata) for the full component contract. Any
component can fetch the graph at `${basePath}/site-meta.json` and walk or index it.

## Extraction

NLP fields require `extract.url` in `mdsite.yaml` pointing at a running
[taggly](https://github.com/kotulc/taggly) instance, and run only when requested: the CLI
`--extract` flag per build, or `extract.on_build: true` for every build (including
`npm run ingest`, which reads `mdsite.yaml`). Without extraction the structural graph is
still written. When extraction is configured but not requested, the build logs that it was
skipped; when requested and the service is unreachable, the build fails by default
(`extract.strict: false` warns and skips).

taggly commands and their parameters (`normalize: true` always sent where supported):

| Command | Fields produced | Params sent |
|---------|-----------------|-------------|
| `/ext` | one array per `extract_concepts` group, plain-sliced to `max_concepts` | `concepts=<joined list>`, `max_ngram=2`, `normalize=true` |
| `/ent` | `tags.entities` | `top_n=max_entities`, `max_ngram=2`, `normalize=true` |
| `/key` | `tags.keywords` | `top_n=max_keywords`, `ngram_max=1`, `normalize=true` |
| `/desc` | `desc` (pages only, opt-in) | — |
| `/polar` | `metrics.polarity` | — |
| `/spam` | `metrics.spam` | — |
| `/tox` | `metrics.toxicity` | — |
| `/score` | `related` scores | — (query + candidate desc/tag strings) |
| `/rank` | `page_tags` (pages only) | `top_n=page_tags` (query + non-keyword, non-title tag terms) |

Input length caps: `/ext`, `/ent`, `/key`, `/polar`, `/spam`, `/tox` are capped at 1500
characters of reduced plain prose — taggly's extraction and classifier models silently
degrade (`/ext` returns empty groups, no error) or reject longer input. `/desc`, `/score`,
and `/rank` are generative/embedding-based and tolerate far more, capped at
8000.

## Requirements

1. REQ-1: The structural graph (folders, pages, sections, `metrics.word_count`/`.reading_time`, links, dates, hash) is written on every ingest, with or without extraction
2. REQ-2: The graph mirrors the content directory; the root is a `root` node named after the site title
3. REQ-3: Sections nest `##` > `###`; deeper headings fold into content; the page title is not a section
4. REQ-4: Generated pages contain no frontmatter
5. REQ-5: With extraction, leaf nodes are scored directly and parents aggregate (tag groups unioned and re-capped, metrics averaged); `metrics` is merged onto the node, not replaced
6. REQ-6: With extraction, each page gets up to `top_n_related` related pages scored by description (or tag-term) similarity
7. REQ-7: A page whose content hash matches the previous build's graph, under an unchanged extract config, is skipped — its tags/metrics/desc/page_tags/updated are copied forward, and no taggly calls are made for it
8. REQ-8: `desc` is computed once per page from its full text when `extract_descriptions: true` (the default); sections never get a `desc` and page `desc` is not aggregated from sections
9. REQ-9: Changing any extract config field that affects computed output invalidates the content-hash cache for every page on the next run
10. REQ-10: No tag group, at any node, ever exceeds its configured size (`max_concepts`/`max_entities`/`max_keywords`) — including after aggregation
11. REQ-11: `page_tags` holds a page's top `page_tags`-count (default 5) non-`keywords` tags, selected via `/rank` against the page's own text, with any term matching the page title excluded before ranking

## Test Cases

- `test_site_meta_root_is_site_title`, `test_site_meta_mirrors_folders_and_pages` — REQ-1, REQ-2
- `test_section_tree_nests_by_level`, `test_section_tree_folds_deep_headings`, `test_build_page_strips_title_from_body` — REQ-3
- `test_pages_have_no_frontmatter` — REQ-4
- `test_extract_node_leaf_uses_own_content`, `test_extract_node_parent_aggregates_children`, `test_aggregate_tags_unions_each_group`, `test_aggregate_metrics_means_each_key`, `test_extract_node_merges_metrics_onto_structural_fields` — REQ-5
- `test_compute_related_prefers_desc_scores_and_ranks`, `test_compute_related_falls_back_to_tags_without_desc` — REQ-6
- `test_hash_changes_with_content_and_matches_identical_content`, `test_extract_graph_skips_pages_with_unchanged_hash` — REQ-7
- `test_page_desc_uses_full_page_text_not_tags`, `test_page_desc_empty_for_empty_page` — REQ-8
- `test_config_hash_changes_with_relevant_field`, `test_extract_graph_reextracts_all_when_config_changed` — REQ-9
- `test_aggregate_tags_recaps_group_after_union` — REQ-10
- `test_tag_candidates_excludes_keywords_and_title`, `test_tag_candidates_dedupes_across_groups`, `test_select_page_tags_ranks_with_page_text_as_query`, `test_select_page_tags_regroups_ranked_terms_by_original_group`, `test_select_page_tags_empty_when_disabled` — REQ-11
