/**
 * Flat page metadata builder (no site graph, no content hashing).
 * Projects supplied frontmatter through `frontmatter.facets` — frontmatter is inert unless
 * the config names it.
 */
const { word_count, extract_links, section_tree, first_paragraph } = require('./text')
const { DEFAULTS, FACET_DEFAULTS } = require('./config')
const { normalize_semver } = require('./semver')


function field_value(fm, key) {
  for (const k of (Array.isArray(key) ? key : [key])) {
    const value = (fm || {})[k]
    if (value != null && String(value).trim() !== '') return value
  }
  return null
}


function clean_list(raw) {
  const seen = new Set()
  return raw.map(String).map(v => v.trim()).filter(v => {
    const key = v.toLowerCase()
    if (!v || seen.has(key)) return false
    seen.add(key)
    return true
  })
}


function read_field_value(fm, field_key, sort, { inherit, release } = {}) {
  let raw = field_value(fm, field_key)
  if (raw == null && inherit && release) raw = release
  if (raw == null) return null

  if (Array.isArray(raw)) {
    const list = clean_list(raw).map(v => sort === 'semver' ? (normalize_semver(v) || v) : v)
    return list.length ? list : null
  }

  let value = String(raw).trim()
  if (sort === 'semver') value = normalize_semver(value) || value
  return value
}


function build_facets(fm, facets, versioning, release) {
  /** Facet values keyed by frontmatter field name. */
  const out = {}
  const specs = facets || FACET_DEFAULTS
  if (versioning) {
    const value = read_field_value(fm, versioning.key, 'semver', {
      inherit: versioning.inherit, release,
    })
    if (value != null) out[versioning.key] = value
  }
  for (const spec of Object.values(specs)) {
    for (const field_key of spec.key) {
      const value = read_field_value(fm, field_key, spec.sort)
      if (value != null) out[field_key] = value
    }
  }
  return out
}


function parse_desc(fm, frontmatter) {
  const value = field_value(fm, (frontmatter || DEFAULTS.frontmatter).description)
  return value == null ? null : String(value).trim() || null
}


function parse_published(fm, frontmatter) {
  const value = field_value(fm, (frontmatter || DEFAULTS.frontmatter).date)
  return value == null ? '' : String(value).slice(0, 10)
}


function parse_reading_time(fm, frontmatter) {
  const raw = field_value(fm, (frontmatter || DEFAULTS.frontmatter).reading_time)
  if (raw == null) return null
  const mins = Number(raw)
  return Number.isFinite(mins) && mins > 0 ? Math.round(mins) : null
}


function parse_related(fm, frontmatter) {
  const raw = field_value(fm, (frontmatter || DEFAULTS.frontmatter).related)
  if (!Array.isArray(raw)) return []
  return raw.map(entry => {
    if (typeof entry === 'string') return { url: entry, name: entry }
    if (entry && typeof entry === 'object') {
      return { url: String(entry.url || ''), name: String(entry.title || entry.name || entry.url || '') }
    }
    return null
  }).filter(r => r && r.url)
}


function build_sections(section_nodes) {
  return (section_nodes || []).map(node => ({
    name: node.name,
    level: node.level,
    sections: build_sections(node.children || []),
  }))
}


function build_page({ slug, title, url, content, source, created, fm, snapshot }, config) {
  const frontmatter = (config && config.frontmatter) || DEFAULTS.frontmatter
  const facets = (frontmatter && frontmatter.facets) || FACET_DEFAULTS
  const body = content.replace(/\r\n?/g, '\n').replace(/^\s*#\s+.+\n?/, '')
  const { intro, sections: tree } = section_tree(body)
  const excerpt = first_paragraph(intro)
    || first_paragraph((tree[0] || {}).content)
    || parse_desc(fm, frontmatter)

  const mins = parse_reading_time(fm, frontmatter)
  const metrics = { word_count: word_count(body) }
  if (mins != null) metrics.reading_time = mins

  return {
    name: title,
    url,
    slug,
    source:    source || '',
    published: parse_published(fm, frontmatter),
    created:   created || '',
    desc:      parse_desc(fm, frontmatter),
    excerpt:   excerpt || '',
    metrics,
    links:     extract_links(content),
    related:   parse_related(fm, frontmatter),
    facets:    build_facets(fm, facets, config && config.versioning, config && config.release),
    sections:  build_sections(tree),
    snapshot:  snapshot || '',
  }
}


module.exports = {
  word_count, extract_links, section_tree,
  field_value, read_field_value, build_facets,
  parse_desc, parse_published, parse_reading_time, parse_related,
  build_page, build_sections,
}
