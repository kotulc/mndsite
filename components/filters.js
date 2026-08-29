/**
 * Facet filter resolution for the left tree.
 * Turns the active collection and query params into a per-facet value constraint, and
 * decides whether a page or folder survives it. Filtering scopes navigation only —
 * every page keeps its route, and a page missing a facet's field matches any filter on it.
 *
 * Query params: ?c=<collection> ?view=<tree|facet> ?<facet>=<value,value>
 */
import siteConfig from '../site.config'
import siteMeta from '../public/site-meta.json'
import { facet_config, facet_values } from './facets'


const PAGES = siteMeta.pages || []

function strip(route) {
  return route && route.length > 1 ? route.replace(/\/+$/, '') : route || '/'
}

const PAGE_INDEX = Object.fromEntries(PAGES.map(p => [strip(p.url), p]))


function compare_semver(a, b) {
  /** Numeric dotted-segment compare, tolerating a leading "v" and uneven lengths. */
  const parts = s => String(s).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)
  const [pa, pb] = [parts(a), parts(b)]
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0)
  }
  return 0
}


function comparator(spec) {
  /** Ascending order for one facet's values, per its declared `sort`. */
  if (spec.sort === 'semver') return compare_semver
  if (spec.sort === 'date') return (a, b) => String(a).localeCompare(String(b))
  if (spec.sort === 'listed') {
    const order = spec.values || []
    return (a, b) => order.indexOf(a) - order.indexOf(b)
  }
  return (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })
}


export function facet_domain(name) {
  /** Every value present on some page, in the facet's sort order. */
  const spec = facet_config(name)
  if (!spec) return []

  const seen = new Set()
  for (const page of PAGES) {
    for (const value of facet_values((page.facets || {})[name])) seen.add(value)
  }
  return [...seen].sort(comparator(spec))
}


function constraint(name, value) {
  /** One facet's allowed values: null means unconstrained. */
  if (value == null || value === 'all') return null
  if (value === 'latest') {
    const domain = facet_domain(name)
    return domain.length ? [domain[domain.length - 1]] : null
  }
  const list = typeof value === 'string' ? value.split(',') : value
  const values = facet_values(list).map(v => String(v).trim()).filter(Boolean)
  return values.length ? values : null
}


export function collection_names() {
  /** Declared presets, without the reserved `default` key. */
  return Object.keys(siteConfig.collections || {}).filter(name => name !== 'default')
}


export function active_collection(query) {
  /** The preset named by ?c, else the configured default. */
  const requested = (query || {}).c
  const collections = siteConfig.collections || {}
  if (requested && (requested === 'all' || collections[requested])) return requested
  return collections.default || 'all'
}


export function active_view(query) {
  /** The view named by ?view, else the first declared view. */
  const views = (siteConfig.sidebar || {}).views || ['tree']
  const requested = (query || {}).view
  return views.includes(requested) ? requested : views[0]
}


export function resolve_filter(query) {
  /** Per-facet constraints, in precedence order: a ?<facet> param, then the active
   *  collection's preset, then the facet's own `default`. Unset anywhere means all. */
  const name = active_collection(query)
  const preset = name === 'all' ? {} : (siteConfig.collections || {})[name] || {}
  const facets = siteConfig.facets || {}

  const filter = {}
  for (const facet of Object.keys(facets)) {
    const raw = (query || {})[facet] !== undefined ? query[facet]
      : preset[facet] !== undefined ? preset[facet]
      : facets[facet].default
    filter[facet] = constraint(facet, raw)
  }
  return filter
}


export function page_matches(page, filter) {
  /** A page survives when every constrained facet it declares has an allowed value. */
  for (const [name, allowed] of Object.entries(filter || {})) {
    if (!allowed) continue
    const values = facet_values((page.facets || {})[name])
    if (!values.length) continue   // no value for this facet — matches any filter on it
    if (!values.some(value => allowed.includes(value))) return false
  }
  return true
}


export function route_visible(route, filter) {
  /** A directory route follows its descendants — it is worth showing only while something
   *  under it is. A leaf follows its own facets, and a route with no page record at all
   *  (a separator, a generated landing page) stays. Nextra types a directory with an index
   *  page as a plain doc, so folder-ness is decided here from the page list, not the item. */
  const key = strip(route)
  const prefix = key === '/' ? '/' : `${key}/`

  const children = PAGES.filter(p => strip(p.url).startsWith(prefix))
  if (children.length) return children.some(p => page_matches(p, filter))

  const page = PAGE_INDEX[key]
  return !page || page_matches(page, filter)
}


export function grouped_pages(facet, filter) {
  /** Pages that survive the filter, bucketed by one facet's values for a facet view.
   *  Newest first for ordered facets; declaration order otherwise. */
  const spec = facet_config(facet)
  if (!spec) return []

  const domain = facet_domain(facet)
  const ordered = spec.sort === 'semver' || spec.sort === 'date' ? [...domain].reverse() : domain

  return ordered.map(value => ({
    value,
    pages: PAGES.filter(page =>
      facet_values((page.facets || {})[facet]).includes(value) && page_matches(page, filter)
    ),
  })).filter(group => group.pages.length)
}
