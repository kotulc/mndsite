/**
 * Facet and sidebar-group helpers shared by chip rendering and filtering.
 * Facet definitions live under frontmatter.facets; frontmatter.groups declare sidebar
 * bundles. display.sidebar lists `pages` and group names exactly as declared.
 */
import siteConfig from '../site.config'


function configured_facets() {
  return (siteConfig.frontmatter || {}).facets || {}
}


function configured_groups() {
  return (siteConfig.frontmatter || {}).groups || {}
}


export function facet_config(name) {
  return configured_facets()[name] || null
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
  const versioning = siteConfig.versioning
  if (versioning && field_key === versioning.key) return singular_title(versioning.key)
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
  const versioning = siteConfig.versioning
  if (versioning) add(versioning.key)
  for (const spec of Object.values(configured_facets())) {
    for (const key of facet_keys(spec)) add(key)
  }
  return keys
}


export function header_field_keys(header) {
  /** Frontmatter field keys to chip, walking display.header. */
  const facets = configured_facets()
  const versioning = siteConfig.versioning
  const keys = []
  const add = key => { if (key && !keys.includes(key)) keys.push(key) }

  for (const item of header || []) {
    if (item === 'facets') {
      for (const key of all_field_keys()) add(key)
    } else if (facets[item]) {
      for (const key of facet_keys(facets[item])) add(key)
    } else if (versioning && item === versioning.key) {
      add(versioning.key)
    } else if (all_field_keys().includes(item)) {
      add(item)
    }
  }
  return keys
}


export function listing_field_keys(view, field) {
  /** Field keys to chip on an index card: header chips minus the open group. */
  const group = sidebar_group(view)
  const skip = new Set([field])
  if (group) for (const key of group.fields) skip.add(key)
  const versioning = siteConfig.versioning
  if (group && group.versioning && versioning && versioning.group_by) {
    skip.add(versioning.group_by)
  }
  return header_field_keys((siteConfig.display || {}).header).filter(key => !skip.has(key))
}


export function group_chips(facets, field_keys) {
  const wanted = field_keys || all_field_keys()
  const chips = []
  for (const key of wanted) {
    for (const term of group_values((facets || {})[key])) chips.push({ term, group: key })
  }
  return chips
}


function build_sidebar_group(name, value) {
  const facets = configured_facets()
  const versioning = siteConfig.versioning
  const VERSIONING = 'versioning'

  function versioning_group(fields) {
    if (!versioning) return null
    return {
      id: name,
      label: fields.length === 1 && fields[0] === versioning.key ? versioning.label : name,
      fields,
      versioning: true,
    }
  }

  if (value === VERSIONING) {
    return versioning_group(versioning ? [versioning.key] : [])
  }
  if (!Array.isArray(value)) return null

  const uses_versioning = value.includes(VERSIONING)
  const fields = []
  for (const item of value) {
    if (item === VERSIONING) {
      if (versioning) fields.push(versioning.key)
      continue
    }
    const spec = facets[item]
    if (spec) for (const key of facet_keys(spec)) fields.push(key)
  }
  if (uses_versioning) return versioning_group(fields)
  return { id: name, label: name, fields }
}


export function sidebar_group(id) {
  return sidebar_groups().find(group => group.id === id) || null
}


export function sidebar_groups() {
  /** Index groups from display.sidebar — `pages` is omitted. */
  const order = (siteConfig.display || {}).sidebar || []
  const groups_cfg = configured_groups()
  const by_name = Object.fromEntries(
    Object.entries(groups_cfg)
      .map(([name, value]) => [name, build_sidebar_group(name, value)])
      .filter(([, group]) => group),
  )

  const groups = []
  for (const item of order) {
    if (item === 'pages') continue
    if (by_name[item]) groups.push(by_name[item])
  }
  return groups
}


export function sidebar_toggles() {
  /** Sidebar tab order from display.sidebar — includes pages when listed. */
  const order = (siteConfig.display || {}).sidebar || []
  const index_by_id = Object.fromEntries(sidebar_groups().map(group => [group.id, group]))
  const toggles = []
  for (const item of order) {
    if (item === 'pages') toggles.push({ id: 'pages', label: 'Pages' })
    else if (index_by_id[item]) toggles.push(index_by_id[item])
  }
  return toggles
}
