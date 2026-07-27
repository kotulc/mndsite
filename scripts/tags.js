/**
 * Local keyword extraction + embedding-based scoring and grouping.
 *
 * For each page/section unit:
 *   1. Extract up to max_keywords candidate terms (frequency / n-grams)
 *   2. Score each candidate (and each user term) vs the unit title via embeddings
 *   3. Assign auto terms to a fixed group by similarity to group label prompts
 *   4. Force user/frontmatter terms into group "user"
 *   5. Merge user-first, then auto by score; keep up to max_keywords in metadata
 *      (UI displays the first page_tags of that list)
 *
 * Embeddings: @xenova/transformers (all-MiniLM-L6-v2). Inject `embedder` in tests.
 */
const { plain_text } = require('./text')

const USER_GROUP = 'user'
const AUTO_GROUPS = ['category', 'topic', 'concept', 'entity']

/** Short prompts embed more stably than bare label words. */
const GROUP_PROMPTS = {
  category: 'a content category or section type',
  topic:    'a subject topic or theme',
  concept:  'an abstract concept or idea',
  entity:   'a named entity, product, or proper noun',
}

const STOPWORDS = new Set(`
  a an the and or but if in on at to for of as is was are were be been being
  this that these those it its with from by into through during before after
  above below up down out off over under again further then once here there
  when where why how all each few more most other some such no nor not only
  own same so than too very can will just should now also may might must
  do does did doing done have has had having i you he she we they them
  my your his her our their what which who whom
`.trim().split(/\s+/))


function tokenize(text) {
  return plain_text(text)
    .toLowerCase()
    .match(/[a-z][a-z0-9+]{1,}(?:-[a-z0-9]+)*/g) || []
}


function extract_keywords(text, max_keywords) {
  /** Frequency-based unigram + bigram pool; stopwords removed. */
  const words = tokenize(text).filter(w => !STOPWORDS.has(w) && w.length > 2)
  const counts = new Map()
  const bump = (term, w = 1) => counts.set(term, (counts.get(term) || 0) + w)

  for (let i = 0; i < words.length; i++) {
    bump(words[i], 1)
    if (i + 1 < words.length) {
      const a = words[i], b = words[i + 1]
      if (!STOPWORDS.has(a) && !STOPWORDS.has(b)) bump(`${a} ${b}`, 1.5)
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, max_keywords)
    .map(([term]) => term)
}


function cosine(a, b) {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na  += a[i] * a[i]
    nb  += b[i] * b[i]
  }
  if (!na || !nb) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}


let _pipeline = null
let _embed_mode = null // 'mini' | 'offline'

/** Deterministic local embedder for offline/CI when HuggingFace is unreachable.
 *  Enable with MDSITE_OFFLINE_EMBED=1 (or when the real model fails to load). */
async function offline_embedder(texts) {
  return texts.map(t => {
    const v = new Array(32).fill(0)
    const s = String(t || '')
    for (let i = 0; i < s.length; i++) v[i % 32] += (s.charCodeAt(i) % 97) / 97
    // light bigram signal so similar phrases score closer
    for (let i = 0; i + 1 < s.length; i++) v[(s.charCodeAt(i) + s.charCodeAt(i + 1)) % 32] += 0.15
    const n = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1
    return v.map(x => x / n)
  })
}


async function ensure_pipeline() {
  /** Resolve MiniLM once; on failure lock into offline mode for the rest of the process. */
  if (_embed_mode === 'offline' || process.env.MDSITE_OFFLINE_EMBED === '1') {
    _embed_mode = 'offline'
    return null
  }
  if (_pipeline) return _pipeline
  try {
    const { pipeline } = await import('@xenova/transformers')
    _pipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    _embed_mode = 'mini'
    return _pipeline
  } catch (err) {
    console.warn(`  Warning: embedding model unavailable (${err.cause?.code || err.message}) — using offline embedder`)
    console.warn('  Tip: set MDSITE_OFFLINE_EMBED=1 to skip the download, or cache Xenova/all-MiniLM-L6-v2 once HuggingFace is reachable')
    _embed_mode = 'offline'
    _pipeline = null
    return null
  }
}


async function default_embedder(texts) {
  /** Lazy-load MiniLM; fall back to offline_embedder if remote weights are unavailable. */
  const pipe = await ensure_pipeline()
  if (!pipe) return offline_embedder(texts)
  const out = []
  for (const t of texts) {
    const tensor = await pipe(t, { pooling: 'mean', normalize: true })
    out.push(Array.from(tensor.data))
  }
  return out
}


async function tag_unit({ title, text, user_terms, max_keywords, page_tags, embedder }) {
  /** Score + group keywords for one page or section. Returns merged tag list. */
  const embed = embedder || default_embedder
  const max_kw = Math.max(1, max_keywords || 32)
  // page_tags used by callers for display; pool size is max_keywords
  void page_tags

  const auto_terms = extract_keywords(text, max_kw)
  const users = (user_terms || []).map(t => String(t).trim()).filter(Boolean)

  // Candidates to embed: title, group prompts, user terms, auto terms
  const group_labels = AUTO_GROUPS.map(g => GROUP_PROMPTS[g])
  const uniq_auto = auto_terms.filter(t => !users.some(u => u.toLowerCase() === t.toLowerCase()))
  const to_embed = [title || '', ...group_labels, ...users, ...uniq_auto]
  const vectors = await embed(to_embed.map(t => t || ' '))

  const title_vec = vectors[0]
  const group_vecs = vectors.slice(1, 1 + AUTO_GROUPS.length)
  let i = 1 + AUTO_GROUPS.length

  function score_term(term_vec) {
    return Math.max(0, Math.min(1, cosine(term_vec, title_vec)))
  }

  function assign_group(term_vec) {
    let best = 0, best_i = 0
    for (let g = 0; g < group_vecs.length; g++) {
      const s = cosine(term_vec, group_vecs[g])
      if (s > best) { best = s; best_i = g }
    }
    return AUTO_GROUPS[best_i]
  }

  const user_tags = users.map(term => {
    const vec = vectors[i++]
    return { term, score: round4(score_term(vec)), group: USER_GROUP }
  })

  const auto_tags = uniq_auto.map(term => {
    const vec = vectors[i++]
    return {
      term,
      score: round4(score_term(vec)),
      group: assign_group(vec),
    }
  })

  // User first (still scored), then auto by descending title-relevance
  auto_tags.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term))
  const merged = [...user_tags, ...auto_tags]
  return merged.slice(0, max_kw)
}


function round4(n) {
  return Math.round(n * 10000) / 10000
}


function page_fingerprint(page, tag_limit = 8) {
  /** Short text used to embed a page for related-page scoring. */
  const terms = (page.tags || []).slice(0, tag_limit).map(t => t.term).join(' ')
  return [page.name || '', page.desc || '', terms].filter(Boolean).join('. ')
}


async function fill_related(pages, { top_n_related = 3, embedder } = {}) {
  /** Pairwise embedding similarity across pages; writes page.related = [{ name, url, score }].
   *  Skips self and urls already present in page.links. Mutates pages in place. */
  const n = Math.max(0, parseInt(top_n_related, 10) || 0)
  if (!pages.length || n === 0) {
    for (const p of pages) p.related = []
    return pages
  }

  const embed = embedder || default_embedder
  const texts = pages.map(p => page_fingerprint(p) || p.name || p.url)
  const vectors = await embed(texts.map(t => t || ' '))

  for (let i = 0; i < pages.length; i++) {
    const linked = new Set((pages[i].links || []).map(l => l.split('#')[0].replace(/\/$/, '') || l))
    const scored = []
    for (let j = 0; j < pages.length; j++) {
      if (i === j) continue
      const other = pages[j]
      const other_key = (other.url || '').replace(/\/$/, '')
      if (linked.has(other.url) || linked.has(other_key)) continue
      scored.push({
        name: other.name,
        url: other.url,
        score: round4(Math.max(0, cosine(vectors[i], vectors[j]))),
      })
    }
    scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    pages[i].related = scored.slice(0, n)
  }
  return pages
}


module.exports = {
  USER_GROUP, AUTO_GROUPS, GROUP_PROMPTS, STOPWORDS,
  tokenize, extract_keywords, cosine, tag_unit, default_embedder, offline_embedder,
  page_fingerprint, fill_related,
}
