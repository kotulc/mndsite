/**
 * NLP metadata extraction via a local taggly service (github.com/kotulc/taggly).
 * Walks the structural site graph bottom-up (leaf sections -> sections -> page) and
 * layers NLP metadata onto every page and section node:
 *   - tags:    concept groups (via /ext), entities (via /ent), keywords (via /key),
 *              each capped to its configured size via taggly's own top_n (or a plain
 *              slice for /ext, which has no top_n of its own)
 *   - metrics: polarity, spam, toxicity (via /polar, /spam, /tox)
 * Leaf content is scored directly; parent nodes aggregate their children (tag groups
 * union+dedupe, metrics average). Page descriptions (via /desc) are optional and
 * computed once per page directly from its full text — not aggregated from sections.
 * Related pages are scored per page via /score, comparing descriptions when available
 * (extract_descriptions) and falling back to each page's combined tag terms otherwise.
 * Pages whose content hash matches the previous build are skipped and carry their
 * previous tags/metrics/desc forward unchanged; changing the extract config invalidates
 * this cache for every page. All output lands in the graph.
 * Enabled by extract.url in mdsite.yaml; runs only via --extract or extract.on_build.
 */
const crypto = require('crypto')
const { flatten_pages, plain_text } = require('./graph')


// Input length caps: taggly's extraction/classifier models silently degrade (empty
// results, no error) or reject requests above roughly 512 tokens of input.
const TEXT_MAX = 1500   // /ext, /ent, /key, /polar, /spam, /tox
const DESC_MAX  = 8000  // /desc, /score (generative/embedding, tolerate far more input)

// extract config fields that change what taggly computes — hashed to invalidate the
// per-page content-hash cache when the user edits extraction settings
const CONFIG_FIELDS = [
  'extract_concepts', 'max_concepts', 'max_keywords', 'max_entities',
  'score_polarity', 'score_toxicity', 'score_spam', 'extract_descriptions',
]


function query_string(params) {
  /** Build a ?a=b&c=d query string from a flat params object ({} -> ''). */
  const q = new URLSearchParams(params).toString()
  return q ? `?${q}` : ''
}


function config_hash(cfg) {
  /** Hash the extract config fields that affect computed tags/metrics/desc, so a
   *  settings change invalidates the content-hash cache even when pages didn't change. */
  const relevant = Object.fromEntries(CONFIG_FIELDS.map(k => [k, cfg[k]]))
  return crypto.createHash('sha256').update(JSON.stringify(relevant)).digest('hex').slice(0, 16)
}


async function taggly(cfg, cmd, body, params) {
  /** POST a JSON body to a taggly command with query params; returns the parsed response. */
  const res = await fetch(`${cfg.url}/${cmd}${query_string(params || {})}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`taggly /${cmd} responded HTTP ${res.status}`)
  return res.json()
}


async function check_service(url) {
  /** Throw a clear error if the configured taggly instance is unreachable. */
  try {
    const res = await fetch(`${url}/status`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (err) {
    throw new Error(`extract.url '${url}' is unreachable (${err.message}) — start taggly or unset extract.url`)
  }
}


async function node_tags(call, cfg, text) {
  /** Extract this node's own tag groups: /ext concept groups (plain-sliced to
   *  max_concepts — /ext has no top_n of its own), /ent entities and /key keywords
   *  (each capped via taggly's native top_n). */
  const prose = plain_text(text).slice(0, TEXT_MAX)
  if (!prose) return null
  const tags = {}

  if (cfg.extract_concepts.length) {
    const { concepts } = await call('ext', { content: prose },
      { concepts: cfg.extract_concepts.join(', '), max_ngram: 2, normalize: true })
    for (const [group, terms] of Object.entries(concepts)) {
      tags[group] = terms.slice(0, cfg.max_concepts)
    }
  }

  const { entities } = await call('ent', { content: prose }, { top_n: cfg.max_entities, max_ngram: 2, normalize: true })
  tags.entities = entities

  const { keywords } = await call('key', { content: prose }, { top_n: cfg.max_keywords, ngram_max: 1, normalize: true })
  tags.keywords = keywords

  return tags
}


async function node_metrics(call, cfg, text) {
  /** Score this node's own content: polarity/spam/toxicity, each individually gated. */
  const prose = plain_text(text).slice(0, TEXT_MAX)
  if (!prose) return null
  const metrics = {}

  if (cfg.score_polarity) metrics.polarity = (await call('polar', { content: prose })).scores
  if (cfg.score_spam)     metrics.spam     = (await call('spam',  { content: prose })).score
  if (cfg.score_toxicity) metrics.toxicity = (await call('tox',   { content: prose })).score

  return metrics
}


function union(lists) {
  /** Concatenate lists, deduped, preserving first-seen order. */
  return [...new Set([].concat(...lists))]
}


function mean_scores(values) {
  /** Element-wise mean of an array of numbers or of flat { key: number } objects. */
  const round = n => Math.round(n * 1e4) / 1e4
  const mean = nums => round(nums.reduce((a, b) => a + b, 0) / nums.length)
  if (!values.length) return 0
  if (typeof values[0] === 'number') return mean(values)
  return Object.fromEntries(Object.keys(values[0]).map(k => [k, mean(values.map(v => v[k]))]))
}


function aggregate_tags(metas) {
  /** Union each tag group across children (deduped, first-seen order). */
  const groups = new Set(metas.flatMap(m => Object.keys(m.tags || {})))
  return Object.fromEntries([...groups].map(g => [g, union(metas.map(m => (m.tags || {})[g] || []))]))
}


function aggregate_metrics(metas) {
  /** Mean each metric key across children. */
  const keys = new Set(metas.flatMap(m => Object.keys(m.metrics || {})))
  return Object.fromEntries([...keys].map(k => [k, mean_scores(metas.map(m => m.metrics[k]).filter(v => v !== undefined))]))
}


async function extract_node(node, call, cfg) {
  /** Bottom-up: enrich all child sections, then set this node's tags/metrics from its
   *  own content plus its children's (single-source nodes pass through unchanged). */
  for (const child of node.children || []) await extract_node(child, call, cfg)

  const metas = []
  if (node.content && node.content.trim()) {
    const [tags, metrics] = await Promise.all([node_tags(call, cfg, node.content), node_metrics(call, cfg, node.content)])
    metas.push({ tags, metrics })
  }
  for (const child of node.children || []) {
    if (child.tags || child.metrics) metas.push({ tags: child.tags, metrics: child.metrics })
  }

  if (metas.length === 1) {
    if (metas[0].tags)    node.tags    = metas[0].tags
    if (metas[0].metrics) node.metrics = metas[0].metrics
  } else if (metas.length > 1) {
    node.tags    = aggregate_tags(metas)
    node.metrics = aggregate_metrics(metas)
  }
}


function page_text(node) {
  /** Concatenate a page's own content and all descendant section content. */
  return [node.content || '', ...(node.children || []).map(page_text)].join('\n\n')
}


async function page_desc(call, page) {
  /** Generate a page's description directly from its full text (not from tags/sections). */
  const prose = plain_text(page_text(page)).slice(0, DESC_MAX)
  page.desc = prose ? (await call('desc', { content: prose })).description : ''
}


function tags_string(node) {
  /** Flatten a node's tag groups into one comparable string for related-page scoring. */
  return Object.values(node.tags || {}).flat().join(', ')
}


function compare_text(page) {
  /** A page's description when available, else its combined tag terms. */
  return (page.desc || tags_string(page)).slice(0, DESC_MAX)
}


async function compute_related(pages, call, cfg) {
  /** Score each page's peers by description (when available) or tag terms, and
   *  attach the top related pages with their similarity score. */
  for (const page of pages) {
    const query = compare_text(page)
    const others = pages.filter(p => p !== page && compare_text(p)).slice(0, cfg.max_comparisons)
    if (!query || !others.length) { page.related = []; continue }

    const candidates = others.map(compare_text)
    const { scores } = await call('score', { query, candidates })
    page.related = others
      .map((p, i) => ({ name: p.name, url: p.url, score: Math.round(scores[i] * 1e4) / 1e4 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, cfg.top_n_related)
  }
}


function copy_forward(prior, node) {
  /** Copy a matched previous page's tags/metrics/desc/updated onto its rebuilt node,
   *  recursing into children (safe: identical content hash implies identical structure). */
  if (prior.tags)    node.tags    = prior.tags
  if (prior.metrics) node.metrics = prior.metrics
  if (prior.desc !== undefined) node.desc = prior.desc
  node.updated = prior.updated
  const prior_children = prior.children || []
  ;(node.children || []).forEach((child, i) => { if (prior_children[i]) copy_forward(prior_children[i], child) })
}


async function extract_graph(root, cfg, log = () => {}, previous = {}, previous_config_hash = '') {
  /** Enrich every page (and its sections) with tags/metrics, optionally a description,
   *  then compute related pages. Pages with an unchanged content hash are skipped,
   *  unless the extract config itself changed since the previous build. */
  const hash = config_hash(cfg)
  const config_changed = !!previous_config_hash && hash !== previous_config_hash
  if (config_changed) log('extract config changed since the last build — re-extracting every page')

  const pages = flatten_pages(root)
  let calls = 0, skipped = 0
  const call = (cmd, body, params) => { calls++; return taggly(cfg, cmd, body, params) }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const prior = config_changed ? null : previous[page.url]

    if (prior && prior.hash === page.hash) {
      copy_forward(prior, page)
      skipped++
      log(`page ${i + 1}/${pages.length}: ${page.url} (unchanged, skipped)`)
      continue
    }

    log(`page ${i + 1}/${pages.length}: ${page.url}`)
    await extract_node(page, call, cfg)
    if (cfg.extract_descriptions) await page_desc(call, page)
    page.updated = new Date().toISOString()
  }

  log(`scoring related pages (${pages.length} pages, ${skipped} unchanged, ${calls} taggly calls so far)`)
  await compute_related(pages, call, cfg)
  root.extract_config = hash
  log(`done (${pages.length} pages, ${skipped} unchanged, ${calls} taggly calls)`)
}


module.exports = {
  check_service, extract_graph, extract_node, node_tags, node_metrics, page_desc,
  aggregate_tags, aggregate_metrics, compute_related, mean_scores, union,
  tags_string, compare_text, config_hash, query_string,
}
