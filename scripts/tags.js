/**
 * Local keyword extraction + embedding-based scoring and grouping.
 *
 * For each page/section unit:
 *   1. Extract a frequency-ranked keyword pool (oversampled)
 *   2. Filter candidates (title words, stem/substring overlaps, shared words, user reserved)
 *   3. Score survivors (and each user term) vs the unit title via embeddings
 *   4. Assign auto terms to a fixed group by similarity to group label prompts
 *   5. Force user/frontmatter terms into group "user"
 *   6. Merge user-first, then auto by score; keep up to max_keywords in metadata
 *      (UI displays the first page_tags / section_tags of that list)
 *
 * Embeddings: @xenova/transformers (all-MiniLM-L6-v2), vendored under models/.
 * Inject `embedder` in tests.
 */
const path = require('path')
const { plain_text } = require('./text')

const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'
const LOCAL_MODELS = path.join(__dirname, '../models')

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

/** Pull more raw keywords than we keep so filtering still leaves a full pool. */
const EXTRACT_OVERSAMPLE = 3


function tokenize(text) {
  return plain_text(text)
    .toLowerCase()
    .match(/[a-z][a-z0-9+]{1,}(?:-[a-z0-9]+)*/g) || []
}


function light_stem(word) {
  /** Cheap stem so file/files, config/configs collapse together. */
  const w = String(word || '').toLowerCase()
  if (w.length <= 3) return w
  if (w.endsWith('ies') && w.length > 5) return w.slice(0, -3) + 'y'
  if (w.endsWith('ses') && w.length > 5) return w.slice(0, -2)
  if (w.endsWith('zes') && w.length > 5) return w.slice(0, -2)
  if (w.endsWith('xes') && w.length > 5) return w.slice(0, -2)
  if (w.endsWith('ches') && w.length > 6) return w.slice(0, -2)
  if (w.endsWith('shes') && w.length > 6) return w.slice(0, -2)
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 4) return w.slice(0, -1)
  return w
}


function term_tokens(term) {
  /** Content tokens for a candidate (stopwords dropped). */
  return tokenize(term).filter(w => !STOPWORDS.has(w) && w.length > 2)
}


function term_stems(term) {
  return term_tokens(term).map(light_stem)
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


function overlaps_title(term, title) {
  /** True when any candidate token (or its stem) appears in the title/header. */
  const title_stems = new Set(term_stems(title || ''))
  if (!title_stems.size) return false
  return term_stems(term).some(s => title_stems.has(s))
}


function stems_related(a, b) {
  /** Same stem, or one is a long prefix of the other (config ≈ configuration). */
  if (!a || !b) return false
  if (a === b) return true
  const min = 4
  if (a.length >= min && b.length >= min && (a.startsWith(b) || b.startsWith(a))) return true
  return false
}


function terms_conflict(a, b) {
  /** True when two terms share a stem/prefix, or one is a long substring of the other.
   *  Catches file/files, config/configuration, and repeated words across bigrams. */
  const aa = String(a || '').toLowerCase().trim()
  const bb = String(b || '').toLowerCase().trim()
  if (!aa || !bb) return false
  if (aa === bb) return true

  const min_sub = 4
  if (aa.length >= min_sub && bb.length >= min_sub && (aa.includes(bb) || bb.includes(aa))) {
    return true
  }

  const a_stems = term_stems(aa)
  const b_stems = term_stems(bb)
  if (!a_stems.length || !b_stems.length) return false
  return a_stems.some(as => b_stems.some(bs => stems_related(as, bs)))
}


function filter_candidates(candidates, { title = '', reserved = [] } = {}) {
  /** Drop title words, terms that collide with reserved (user) tags, and near-duplicates.
   *  Input should already be preference-ordered (higher frequency first). Kept order is stable. */
  const kept = []
  const reserved_list = (reserved || []).map(t => String(t).trim()).filter(Boolean)

  for (const raw of candidates || []) {
    const term = String(raw || '').trim()
    if (!term) continue
    if (overlaps_title(term, title)) continue
    if (reserved_list.some(r => terms_conflict(term, r))) continue
    if (kept.some(k => terms_conflict(term, k))) continue
    kept.push(term)
  }
  return kept
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


async function ensure_pipeline() {
  /** Resolve vendored MiniLM once per process. */
  if (_pipeline) return _pipeline
  const { pipeline, env } = await import('@xenova/transformers')
  env.localModelPath = LOCAL_MODELS
  env.allowRemoteModels = false
  env.allowLocalModels = true
  _pipeline = await pipeline('feature-extraction', EMBED_MODEL)
  return _pipeline
}


async function default_embedder(texts) {
  /** Embed via vendored MiniLM. */
  const pipe = await ensure_pipeline()
  const out = []
  for (const t of texts) {
    const tensor = await pipe(t, { pooling: 'mean', normalize: true })
    out.push(Array.from(tensor.data))
  }
  return out
}


async function tag_unit({ title, text, user_terms, max_keywords, page_tags, min_relevance, embedder }) {
  /** Score + group keywords for one page or section. Returns merged tag list. */
  const embed = embedder || default_embedder
  const max_kw = Math.max(1, max_keywords || 32)
  const min_rel = Math.max(0, Math.min(1, Number(min_relevance ?? 0.2)))
  // page_tags used by callers for display; pool size is max_keywords
  void page_tags

  const users = (user_terms || []).map(t => String(t).trim()).filter(Boolean)
  const raw_pool = extract_keywords(text, max_kw * EXTRACT_OVERSAMPLE)
  const auto_terms = filter_candidates(raw_pool, { title, reserved: users }).slice(0, max_kw)

  // Candidates to embed: title, group prompts, user terms, filtered auto terms
  const group_labels = AUTO_GROUPS.map(g => GROUP_PROMPTS[g])
  const to_embed = [title || '', ...group_labels, ...users, ...auto_terms]
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

  const auto_tags = auto_terms.map(term => {
    const vec = vectors[i++]
    return {
      term,
      score: round4(score_term(vec)),
      group: assign_group(vec),
    }
  }).filter(t => t.score >= min_rel)

  // User first (still scored, always kept), then auto by descending title-relevance
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


async function fill_related(pages, { related_links = 3, embedder } = {}) {
  /** Pairwise embedding similarity across pages; writes page.related = [{ name, url, score }].
   *  Skips self and urls already present in page.links. Mutates pages in place. */
  const n = Math.max(0, parseInt(related_links, 10) || 0)
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
  USER_GROUP, AUTO_GROUPS, GROUP_PROMPTS, STOPWORDS, EXTRACT_OVERSAMPLE,
  tokenize, light_stem, term_tokens, stems_related, overlaps_title, terms_conflict, filter_candidates,
  extract_keywords, cosine, tag_unit, default_embedder,
  page_fingerprint, fill_related,
}
