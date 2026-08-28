/**
 * Flat page metadata builder (no site graph, no content hashing).
 * Projects supplied frontmatter through the configured `fields` and `facets` maps —
 * frontmatter is inert unless the config names it, and no value is ever generated.
 *
 * Output shape (public/site-meta.json):
 *   { pages: [ { url, name, slug, identity, published, created, desc, metrics,
 *                links, related, facets, sections } ] }
 *
 * Facet values keep their supplied shape: a list stays a list, a scalar stays a scalar.
 */
const { word_count, extract_links, section_tree } = require('./text')
const { DEFAULTS } = require('./config')


function field_value(fm, key) {
  /** First non-empty frontmatter value for a field mapping (one key or a list of keys). */
  for (const k of (Array.isArray(key) ? key : [key])) {
    const value = (fm || {})[k]
    if (value != null && String(value).trim() !== '') return value
  }
  return null
}


function clean_list(raw) {
  /** Trimmed, de-duplicated string list. */
  const seen = new Set()
  return raw.map(String).map(v => v.trim()).filter(v => {
    const key = v.toLowerCase()
    if (!v || seen.has(key)) return false
    seen.add(key)
    return true
  })
}


function facet_value(fm, spec) {
  /** One facet's value, restricted to `values` when the config declares them. */
  const raw = field_value(fm, spec.field)
  if (raw == null) return null

  const allowed = Array.isArray(spec.values) ? spec.values.map(String) : null
  if (Array.isArray(raw)) {
    const list = clean_list(raw).filter(v => !allowed || allowed.includes(v))
    return list.length ? list : null
  }

  const value = String(raw).trim()
  return !allowed || allowed.includes(value) ? value : null
}


function build_facets(fm, facets) {
  /** Declared facets present on this page, in declaration order. */
  const out = {}
  for (const [name, spec] of Object.entries(facets || DEFAULTS.facets)) {
    const value = facet_value(fm || {}, spec)
    if (value != null) out[name] = value
  }
  return out
}


function parse_desc(fm, fields) {
  /** Optional page summary from the configured description field. */
  const value = field_value(fm, (fields || DEFAULTS.fields).description)
  return value == null ? null : String(value).trim() || null
}


function parse_published(fm, fields) {
  /** Publication date (YYYY-MM-DD) from the configured date field. */
  const value = field_value(fm, (fields || DEFAULTS.fields).date)
  return value == null ? '' : String(value).slice(0, 10)
}


function parse_reading_time(fm, fields) {
  /** Reading time from frontmatter only — never computed locally. */
  const raw = field_value(fm, (fields || DEFAULTS.fields).reading_time)
  if (raw == null) return null
  const mins = Number(raw)
  return Number.isFinite(mins) && mins > 0 ? Math.round(mins) : null
}


function parse_related(fm, fields) {
  /** Optional related links: [{ url, title }] or [url strings]. */
  const raw = field_value(fm, (fields || DEFAULTS.fields).related)
  if (!Array.isArray(raw)) return []
  return raw.map(entry => {
    if (typeof entry === 'string') return { url: entry, name: entry }
    if (entry && typeof entry === 'object') {
      return { url: String(entry.url || ''), name: String(entry.title || entry.name || entry.url || '') }
    }
    return null
  }).filter(r => r && r.url)
}


function parse_identity(fm, fields) {
  /** Stable id grouping variants of the same document (supplied by mndmap). */
  const value = field_value(fm, (fields || DEFAULTS.fields).identity)
  return value == null ? '' : String(value).trim()
}


function build_sections(section_nodes) {
  /** Recursively build section records from the heading tree. */
  return (section_nodes || []).map(node => ({
    name: node.name,
    level: node.level,
    sections: build_sections(node.children || []),
  }))
}


function build_page({ slug, title, url, content, created, fm }, config) {
  /** Build one flat page record from supplied frontmatter and content. */
  const fields = (config && config.fields) || DEFAULTS.fields
  const facets = (config && config.facets) || DEFAULTS.facets
  const body = content.replace(/\r\n?/g, '\n').replace(/^\s*#\s+.+\n?/, '')
  const { sections: tree } = section_tree(body)

  const mins = parse_reading_time(fm, fields)
  const metrics = { word_count: word_count(body) }
  if (mins != null) metrics.reading_time = mins

  return {
    name: title,
    url,
    slug,
    identity:  parse_identity(fm, fields),
    published: parse_published(fm, fields),
    created:   created || '',
    desc:      parse_desc(fm, fields),
    metrics,
    links:     extract_links(content),
    related:   parse_related(fm, fields),
    facets:    build_facets(fm, facets),
    sections:  build_sections(tree),
  }
}


module.exports = {
  word_count, extract_links, section_tree,
  field_value, facet_value, build_facets,
  parse_desc, parse_published, parse_reading_time, parse_related, parse_identity,
  build_page, build_sections,
}
