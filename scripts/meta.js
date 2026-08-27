/**
 * Flat page metadata builder (no site graph, no content hashing).
 * Derives renderer metadata from supplied frontmatter only — no local tagging.
 *
 * Output shape (public/site-meta.json):
 *   { pages: [ { url, name, slug, published, created, desc, metrics, links, related, tags, sections } ] }
 *
 * Each tag: { term, group } where group is one of the fixed vocabulary
 *   category | topic | concept | entity | user
 */
const { word_count, extract_links, section_tree } = require('./text')


/** Fixed group vocabulary. Frontmatter tags use `user`; categories use `category`. */
const TAG_GROUPS = Object.freeze(['category', 'topic', 'concept', 'entity', 'user'])
const USER_GROUP = 'user'
const CATEGORY_GROUP = 'category'


function parse_user_tags(fm) {
  /** Frontmatter tags: `tags: [a, b]` or `tags: a` (string). */
  const out = []
  const raw = fm.tags
  if (Array.isArray(raw)) out.push(...raw.map(String))
  else if (typeof raw === 'string' && raw.trim()) out.push(raw.trim())
  const seen = new Set()
  return out.filter(t => {
    const k = t.toLowerCase()
    if (!t.trim() || seen.has(k)) return false
    seen.add(k)
    return true
  }).map(term => ({ term, group: USER_GROUP }))
}


function parse_categories(fm) {
  /** Frontmatter categories as category-group tags. */
  const out = []
  if (Array.isArray(fm.categories)) out.push(...fm.categories.map(String))
  else if (typeof fm.categories === 'string' && fm.categories.trim()) out.push(fm.categories.trim())
  const seen = new Set()
  return out.filter(t => {
    const k = t.toLowerCase()
    if (!t.trim() || seen.has(k)) return false
    seen.add(k)
    return true
  }).map(term => ({ term, group: CATEGORY_GROUP }))
}


function parse_related(fm) {
  /** Optional frontmatter related links: [{ url, title }] or [url strings]. */
  const raw = fm.related
  if (!Array.isArray(raw)) return []
  return raw.map(entry => {
    if (typeof entry === 'string') return { url: entry, name: entry }
    if (entry && typeof entry === 'object') {
      return { url: String(entry.url || ''), name: String(entry.title || entry.name || entry.url || '') }
    }
    return null
  }).filter(r => r && r.url)
}


function parse_desc(fm) {
  /** Optional page summary from frontmatter (`desc` or `description`). */
  const d = fm.desc ?? fm.description
  if (d == null) return null
  const s = String(d).trim()
  return s || null
}


function parse_reading_time(fm) {
  /** Reading time from frontmatter only — never computed locally. */
  const raw = fm.reading_time
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}


function build_sections(section_nodes) {
  /** Recursively build section records from heading tree (no generated tags). */
  return (section_nodes || []).map(node => ({
    name: node.name,
    level: node.level,
    tags: [],
    sections: build_sections(node.children || []),
  }))
}


function build_page({ slug, title, url, content, published, created, fm }) {
  /** Build one flat page record from supplied frontmatter and content. */
  const body = content.replace(/\r\n?/g, '\n').replace(/^\s*#\s+.+\n?/, '')
  const { sections: tree } = section_tree(body)
  const tags = [...parse_user_tags(fm || {}), ...parse_categories(fm || {})]
  const mins = parse_reading_time(fm || {})
  const metrics = { word_count: word_count(body) }
  if (mins != null) metrics.reading_time = mins

  return {
    name: title,
    url,
    slug,
    published: published || '',
    created:   created || '',
    desc:      parse_desc(fm || {}),
    metrics,
    links:     extract_links(content),
    related:   parse_related(fm || {}),
    tags,
    sections:  build_sections(tree),
  }
}


function display_tags(tag_list, n) {
  /** First n supplied tags. */
  if (!Array.isArray(tag_list) || n <= 0) return []
  return tag_list.slice(0, n)
}


module.exports = {
  TAG_GROUPS, USER_GROUP, CATEGORY_GROUP,
  word_count, extract_links, section_tree,
  parse_user_tags, parse_categories, parse_desc, parse_reading_time, parse_related,
  build_page, build_sections, display_tags,
}
