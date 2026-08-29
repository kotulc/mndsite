/**
 * Facet helpers shared by chip rendering and filtering.
 * A page's facet values are flattened into chips tagged with their facet name, which
 * selects the chip color generated from the facet's configured hue.
 */
import siteConfig from '../site.config'


export function facet_config(name) {
  /** Declaration for one facet, or null when the config does not declare it. */
  return (siteConfig.facets || {})[name] || null
}


export function facet_label(name) {
  const facet = facet_config(name)
  return facet ? facet.label : 'Tag'
}


export function facet_values(value) {
  /** Facet values as a list, whatever shape the frontmatter supplied. */
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
}


export function header_facet_names(header) {
  /** Facets to chip, walking display.header: "facets" expands to every declared
   *  facet not already named, and a facet named directly is chipped wherever it
   *  appears. */
  const declared = siteConfig.facets || {}
  const names = []
  for (const item of header || []) {
    if (item === 'facets') {
      for (const name of Object.keys(declared)) {
        if (!names.includes(name)) names.push(name)
      }
    } else if (declared[item] && !names.includes(item)) {
      names.push(item)
    }
  }
  return names
}


export function listing_facet_names(view, facet) {
  /** Facets to chip on an index card: header chips minus the open facet, its group_by,
   *  and any sibling facets in the same sidebar group. */
  const spec = facet_config(facet) || {}
  const skip = new Set([facet, spec.group_by].filter(Boolean))
  const group = (siteConfig.display || {}).sidebar?.find(g => g.id === view)
  if (group) for (const name of group.facets) skip.add(name)
  return header_facet_names((siteConfig.display || {}).header).filter(name => !skip.has(name))
}


export function facet_chips(facets, names) {
  /** Flatten a page's facets into [{ term, group }]. Without `names`, every declared
   *  facet in declaration order; with `names`, exactly those facets in that order. */
  const wanted = names || Object.keys(siteConfig.facets || {})

  const chips = []
  for (const name of wanted) {
    for (const term of facet_values((facets || {})[name])) chips.push({ term, group: name })
  }
  return chips
}
