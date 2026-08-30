/**
 * Facet indexes for the left nav and listing body.
 * Pages is the directory tree. Each facet (plus optional versioning) is a sidebar
 * group whose field keys supply value chips. State: ?view=<group> ?field=<key> ?on=<value>
 */
import siteConfig from '../site.config'
import siteMeta from '../public/site-meta.json'
import { group_values, sidebar_group, sidebar_groups, sidebar_toggles } from './groups'
import { compare_semver, normalize_semver } from '../scripts/semver'


const PAGES = siteMeta.pages || []
const RELEASE = siteConfig.release || ''


function comparator(sort) {
  if (sort === 'semver') return compare_semver
  if (sort === 'date') return (a, b) => String(a).localeCompare(String(b))
  return (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })
}


function facet_of(page, field_key) {
  return group_values((page.facets || {})[field_key])
}


function facet_spec_for_field(field_key) {
  const facets = (siteConfig.frontmatter || {}).facets || {}
  for (const spec of Object.values(facets)) {
    const keys = Array.isArray(spec.key) ? spec.key : [spec.key]
    if (keys.includes(field_key)) return spec
  }
  return null
}


function field_sort(group, field_key) {
  if (group.versioning) return 'semver'
  return (facet_spec_for_field(field_key) || {}).sort || 'alpha'
}


export { sidebar_groups, sidebar_group, sidebar_toggles }


export function active_view(query) {
  const requested = (query || {}).view
  if (!requested || requested === 'pages') return 'pages'
  return sidebar_group(requested) ? requested : 'pages'
}


export function active_field(query, group_id) {
  const group = sidebar_group(group_id)
  if (!group) return ''
  const requested = (query || {}).field
  if (requested && group.fields.includes(requested)) return requested
  return group.fields[0]
}


export function field_domain(field_key, { head, sort } = {}) {
  const seen = new Set()
  for (const page of PAGES) {
    if (head && page.snapshot) continue
    for (const value of facet_of(page, field_key)) seen.add(value)
  }
  const versioning = siteConfig.versioning
  if (versioning && versioning.history && field_key === versioning.key) {
    for (const page of PAGES) {
      if (page.snapshot) seen.add(page.snapshot)
    }
  }
  return [...seen].sort(comparator(sort || 'alpha'))
}


function ordered_default(group, field_key, domain) {
  if (group.versioning) {
    const versioning = siteConfig.versioning || {}
    if (versioning.default) return versioning.default
    return 'latest'
  }
  const sort = field_sort(group, field_key)
  if (sort === 'semver' || sort === 'date') return domain[domain.length - 1] || ''
  return domain[0] || ''
}


export function selected_value(query, group_id) {
  const group = sidebar_group(group_id)
  if (!group) return ''
  const field_key = active_field(query, group_id)
  const sort = field_sort(group, field_key)
  const domain = field_domain(field_key, { sort })
  const requested = (query || {}).on
  const fallback = ordered_default(group, field_key, domain)
  if (requested === 'latest' || requested === fallback) return requested || fallback
  if (requested && (domain.includes(requested) || requested === 'latest')) return requested
  return fallback
}


export function index_entries(group_id, field_key) {
  const group = sidebar_group(group_id)
  if (!group) return []

  const sort = field_sort(group, field_key)
  const domain = field_domain(field_key, { sort })
  const ordered = sort === 'semver' || sort === 'date' ? [...domain].reverse() : domain
  const rows = []
  const versioning = siteConfig.versioning
  const group_by = group.versioning && versioning ? versioning.group_by : ''

  for (const value of ordered) {
    if (group.versioning && value === 'latest') continue
    if (group_by) {
      const groups = new Set()
      for (const page of listed_pages(group_id, field_key, value)) {
        for (const g of facet_of(page, group_by)) groups.add(g)
      }
      const headings = groups.size
        ? [...groups].sort(comparator('alpha'))
        : [null]
      for (const heading of headings) rows.push({ value, label: value, group: heading })
    } else {
      rows.push({ value, label: value, group: null })
    }
  }
  return rows
}


export function listed_pages(group_id, field_key, value) {
  const group = sidebar_group(group_id)
  if (!group) return []

  if (group.versioning) {
    const versioning = siteConfig.versioning || {}
    if (value === 'latest') {
      if (versioning.history) return PAGES.filter(page => !page.snapshot)
      const domain = field_domain(field_key, { head: true, sort: 'semver' })
      const max = domain[domain.length - 1]
      if (!max) return PAGES.filter(page => !page.snapshot)
      return PAGES.filter(page => !page.snapshot && facet_of(page, field_key).includes(max))
    }
    const snaps = PAGES.filter(page => page.snapshot === value)
    if (snaps.length) return snaps
    return PAGES.filter(page => !page.snapshot && facet_of(page, field_key).includes(value))
  }

  return PAGES.filter(page => !page.snapshot && facet_of(page, field_key).includes(value))
}


export function resolve_semver(value) {
  const versioning = siteConfig.versioning
  const field_key = versioning ? versioning.key : 'version'
  if (value === 'latest') return RELEASE || (field_domain(field_key, { sort: 'semver' }).slice(-1)[0] || '')
  return normalize_semver(value) || value
}
