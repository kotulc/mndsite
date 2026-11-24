import { normalize_tags } from './feed/card-meta.mjs'
import siteConfig from '../site.config'


function configured_facets() {
  return (siteConfig.frontmatter || {}).facets || {}
}


export function facet_keys(spec) {
  if (!spec) return []
  return Array.isArray(spec.key) ? spec.key : [spec.key]
}


function facet_spec_for_field(field_key) {
  for (const spec of Object.values(configured_facets())) {
    if (facet_keys(spec).includes(field_key)) return spec
  }
  return null
}


function singular_title(key) {
  let name = String(key).replace(/_/g, ' ')
  if (name.endsWith('ies')) name = name.slice(0, -3) + 'y'
  else if (name.endsWith('s') && !name.endsWith('ss') && !name.endsWith('us')) name = name.slice(0, -1)
  return name.replace(/\b\w/g, c => c.toUpperCase())
}


export function field_label(field_key) {
  /** Tooltip prefix for a frontmatter field key. */
  const spec = facet_spec_for_field(field_key)
  if (spec) {
    const keys = facet_keys(spec)
    return keys.length === 1 ? spec.label : singular_title(field_key)
  }
  return singular_title(field_key)
}


export function known_field_key(field_key) {
  return all_field_keys().includes(field_key)
}


export function group_values(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
}


export function all_field_keys() {
  const keys = []
  const add = key => { if (key && !keys.includes(key)) keys.push(key) }
  for (const spec of Object.values(configured_facets())) {
    for (const key of facet_keys(spec)) add(key)
  }
  return keys
}


export function header_field_keys(header) {
  /** Frontmatter field keys to chip, walking display.header. */
  const facets = configured_facets()
  const keys = []
  const add = key => { if (key && !keys.includes(key)) keys.push(key) }

  for (const item of header || []) {
    if (item === 'facets') {
      for (const key of all_field_keys()) add(key)
    } else if (facets[item]) {
      for (const key of facet_keys(facets[item])) add(key)
    } else if (all_field_keys().includes(item)) {
      add(item)
    }
  }
  return keys
}


export function group_chips(values, field_keys = all_field_keys()) {
  const chips = []
  const seen = new Set()
  for (const key of field_keys) {
    for (const [facet, spec] of Object.entries(configured_facets())) {
      if (!facet_keys(spec).includes(key)) continue
      const raw = group_values(values?.[key])
      const terms = facet === 'tags' ? normalize_tags(raw.map(String)) : raw
      for (const term of terms) {
        const id = JSON.stringify([facet, term])
        if (seen.has(id)) continue
        seen.add(id)
        chips.push({ term, group: key, facet })
      }
    }
  }
  return chips
}

export function browseFilter(key, value, facet) {
  const name = facet || Object.keys(configured_facets()).find(name => facet_keys(configured_facets()[name]).includes(key))
  if (!name) return null
  if (name === 'tags') {
    const [tag] = normalize_tags([String(value)])
    return tag ? { tag } : null
  }
  return { facet: name, tag: String(value) }
}
