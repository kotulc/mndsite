/**
 * Facet indexes for the left nav and listing body.
 * Pages is the directory tree. Any facet with index: true is a chip that replaces
 * the tree with that facet's values. The selected value lists matching pages in
 * the body. This is a view switcher, not a filter — the tree is never hidden.
 *
 * Query params: ?view=<pages|facet> ?on=<value>
 */
import siteConfig from '../site.config'
import siteMeta from '../public/site-meta.json'
import { facet_config, facet_values } from './facets'
import { compare_semver, normalize_semver } from '../scripts/semver'


const PAGES = siteMeta.pages || []
const RELEASE = siteConfig.release || ''


function comparator(spec) {
  if (spec.sort === 'semver') return compare_semver
  if (spec.sort === 'date') return (a, b) => String(a).localeCompare(String(b))
  if (spec.sort === 'listed') {
    const order = spec.values || []
    return (a, b) => order.indexOf(a) - order.indexOf(b)
  }
  return (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })
}


function facet_of(page, name) {
  return facet_values((page.facets || {})[name])
}


export function sidebar_groups() {
  /** Left-nav index groups from display.sidebar, in config order. */
  return (siteConfig.display || {}).sidebar || []
}


export function index_facets() {
  /** Primary facet of each sidebar group — kept for callers that expect facet names. */
  return sidebar_groups().map(group => {
    const name = group.facets[0]
    return { name, spec: facet_config(name) || {} }
  })
}


export function sidebar_group(id) {
  return sidebar_groups().find(group => group.id === id) || null
}


export function active_view(query) {
  const requested = (query || {}).view
  if (!requested || requested === 'pages') return 'pages'
  return sidebar_group(requested) ? requested : 'pages'
}


export function active_facet(query, group_id) {
  /** Which facet within a group is selected — ?facet=, else the group's first facet. */
  const group = sidebar_group(group_id)
  if (!group) return ''
  const requested = (query || {}).facet
  if (requested && group.facets.includes(requested)) return requested
  return group.facets[0]
}


export function facet_domain(name, { head } = {}) {
  /** Values present on pages, in the facet's sort order. `head` skips snapshot pages. */
  const spec = facet_config(name)
  if (!spec) return []

  const seen = new Set()
  for (const page of PAGES) {
    if (head && page.snapshot) continue
    for (const value of facet_of(page, name)) seen.add(value)
  }
  if (spec.history) {
    for (const page of PAGES) {
      if (page.snapshot) seen.add(page.snapshot)
    }
  }
  return [...seen].sort(comparator(spec))
}


function ordered_default(spec, domain) {
  if (spec.default) return spec.default
  if (spec.sort === 'semver' || spec.sort === 'date') return 'latest'
  return domain[0] || ''
}


export function selected_value(query, name) {
  /** The value selected in an index: ?on, else the facet default, else latest/first.
   *  When `name` is a group id, resolves against the active facet in that group. */
  const group = sidebar_group(name)
  const facet = group ? active_facet(query, name) : name
  const spec = facet_config(facet)
  if (!spec) return ''
  const domain = facet_domain(facet)
  const requested = (query || {}).on
  const fallback = ordered_default(spec, domain)
  if (requested === 'latest' || requested === fallback) return requested || fallback
  if (requested && (domain.includes(requested) || requested === 'latest')) return requested
  return fallback
}


export function index_entries(name) {
  /** Rows for an index list: domain values, optionally grouped. Latest is the
   *  facet default (the Versions toggle), not a row in the list. */
  const spec = facet_config(name)
  if (!spec) return []

  const domain = facet_domain(name)
  const ordered = spec.sort === 'semver' || spec.sort === 'date' ? [...domain].reverse() : domain
  const rows = []

  const group_by = spec.group_by
  for (const value of ordered) {
    if (group_by) {
      const groups = new Set()
      for (const page of listed_pages(name, value)) {
        for (const g of facet_of(page, group_by)) groups.add(g)
      }
      const group_spec = facet_config(group_by)
      const headings = groups.size
        ? [...groups].sort(comparator(group_spec || { sort: 'alpha' }))
        : [null]
      for (const group of headings) rows.push({ value, label: value, group })
    } else {
      rows.push({ value, label: value, group: null })
    }
  }
  return rows
}


export function listed_pages(name, value) {
  /** Pages shown for one index selection. Latest with history is the current
   *  tree; without history it is HEAD pages at the highest stamp. A git snapshot
   *  wins when present; otherwise HEAD pages stamped with that value. */
  const spec = facet_config(name)
  if (value === 'latest') {
    if (spec && spec.history) return PAGES.filter(page => !page.snapshot)
    const domain = facet_domain(name, { head: true })
    const max = domain[domain.length - 1]
    if (!max) return PAGES.filter(page => !page.snapshot)
    return PAGES.filter(page => !page.snapshot && facet_of(page, name).includes(max))
  }

  const snaps = PAGES.filter(page => page.snapshot === value)
  if (snaps.length) return snaps

  return PAGES.filter(page => !page.snapshot && facet_of(page, name).includes(value))
}


export function resolve_semver(value) {
  if (value === 'latest') return RELEASE || (facet_domain('version').slice(-1)[0] || '')
  return normalize_semver(value) || value
}
