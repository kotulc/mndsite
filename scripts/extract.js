/**
 * NLP metadata extraction via a local taggly service (github.com/kotulc/taggly).
 * Walks the structural site graph bottom-up (leaf sections -> sections -> page) and
 * layers NLP metadata onto every page and section node:
 *   - desc, concepts, topics, keywords   (via /tag and /desc)
 *   - polarity, spam, toxicity           (via /polar, /spam, /tox)
 * Leaf content is scored directly; parent nodes aggregate their children (desc is the
 * /desc of combined child descriptions, scores are averaged, tag lists are unioned).
 * Related pages are then scored per page via /score. All output lands in the graph.
 * Enabled by extract.url in mdsite.yaml; runs only via --extract or extract.on_build.
 */
const { flatten_pages, plain_text } = require('./graph')


// Default taggly query parameters per command (mirrors the service's own defaults).
// Every call sends these explicitly; override via extract.taggly in mdsite.yaml.
const TAGGLY_DEFAULTS = {
  tag:   { concepts: 'concepts, entities, topics', max_ngram: 2, top_n: 10, rank: false, score: false, normalize: true },
  desc:  {},
  polar: {},
  spam:  { threshold: 0.5 },
  tox:   { threshold: 0.5 },
}

// Input length caps: generation/embedding models take more, classifiers reject long inputs
const DESC_MAX   = 8000   // /tag, /desc
const METRIC_MAX = 1500   // /polar, /spam, /tox

// Empty NLP fields for nodes with no scorable content (keeps a stable schema)
const EMPTY_META = {
  desc: '', concepts: [], topics: [], keywords: [],
  polarity: { negative: 0, neutral: 0, positive: 0 }, spam: 0, toxicity: 0,
}


function query_string(params) {
  /** Build a ?a=b&c=d query string from a flat params object ({} -> ''). */
  const q = new URLSearchParams(params).toString()
  return q ? `?${q}` : ''
}


async function taggly(cfg, cmd, content) {
  /** POST content to a taggly command with its configured query params. */
  const params = cfg.taggly[cmd] || {}
  const res = await fetch(`${cfg.url}/${cmd}${query_string(params)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`taggly /${cmd} responded HTTP ${res.status}`)
  return res.json()
}


async function taggly_score(cfg, query, candidates) {
  /** POST a query and candidate list to /score; returns a similarity score per candidate. */
  const res = await fetch(`${cfg.url}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, candidates }),
  })
  if (!res.ok) throw new Error(`taggly /score responded HTTP ${res.status}`)
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


async function leaf_meta(cfg, text) {
  /** Compute NLP metadata directly from a node's own content. */
  const prose = plain_text(text)
  const tag = await taggly(cfg, 'tag', prose.slice(0, DESC_MAX))
  return {
    desc:      (await taggly(cfg, 'desc',  prose.slice(0, DESC_MAX))).description,
    concepts:  tag.tags.concepts || [],
    topics:    tag.tags.topics   || [],
    keywords:  tag.tags.keywords || [],
    polarity:  (await taggly(cfg, 'polar', prose.slice(0, METRIC_MAX))).scores,
    spam:      (await taggly(cfg, 'spam',  prose.slice(0, METRIC_MAX))).score,
    toxicity:  (await taggly(cfg, 'tox',   prose.slice(0, METRIC_MAX))).score,
  }
}


async function aggregate(cfg, metas) {
  /** Combine child metadata into a parent: desc re-summarizes combined child descs,
   *  tag lists union (deduped, first-seen order), scores average. */
  const descs = metas.map(m => m.desc).filter(Boolean)
  return {
    desc:      descs.length ? (await taggly(cfg, 'desc', descs.join('\n\n'))).description : '',
    concepts:  union(metas.map(m => m.concepts)),
    topics:    union(metas.map(m => m.topics)),
    keywords:  union(metas.map(m => m.keywords)),
    polarity:  mean_scores(metas.map(m => m.polarity)),
    spam:      mean_scores(metas.map(m => m.spam)),
    toxicity:  mean_scores(metas.map(m => m.toxicity)),
  }
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


function meta_of(node) {
  /** Extract the NLP subset of a node for aggregation. */
  const { desc, concepts, topics, keywords, polarity, spam, toxicity } = node
  return { desc, concepts, topics, keywords, polarity, spam, toxicity }
}


async function extract_node(node, cfg, on_call) {
  /** Bottom-up: enrich all child sections, then set this node's metadata from its own
   *  content plus its children's metadata (single-source nodes pass through unchanged). */
  for (const child of node.children || []) await extract_node(child, cfg, on_call)

  const metas = []
  if (node.content && node.content.trim()) { metas.push(await leaf_meta(cfg, node.content)); on_call?.() }
  for (const child of node.children || []) metas.push(meta_of(child))

  if (!metas.length) Object.assign(node, EMPTY_META)
  else if (metas.length === 1) Object.assign(node, metas[0])
  else { Object.assign(node, await aggregate(cfg, metas)); on_call?.() }
}


async function compute_related(pages, cfg) {
  /** Score each page's description against the others and attach the top related pages. */
  for (const page of pages) {
    const others = pages.filter(p => p !== page && p.desc).slice(0, cfg.max_comparisons)
    if (!page.desc || !others.length) { page.related = []; continue }
    const { scores } = await taggly_score(cfg, page.desc, others.map(p => p.desc))
    page.related = others
      .map((p, i) => ({ name: p.name, url: p.url, score: Math.round(scores[i] * 1e4) / 1e4 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, cfg.top_n_related)
  }
}


async function extract_graph(root, cfg, log = () => {}) {
  /** Enrich every page (and its sections) with NLP metadata, then compute related pages. */
  const pages = flatten_pages(root)
  let calls = 0
  const on_call = () => { calls++ }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    log(`page ${i + 1}/${pages.length}: ${page.url}`)
    await extract_node(page, cfg, on_call)
  }

  log(`scoring related pages (${pages.length} pages, ${calls} taggly calls so far)`)
  await compute_related(pages, cfg)
  log(`done (${pages.length} pages enriched)`)
}


module.exports = {
  TAGGLY_DEFAULTS, check_service, extract_graph, extract_node, leaf_meta,
  aggregate, compute_related, mean_scores, union, query_string,
}
