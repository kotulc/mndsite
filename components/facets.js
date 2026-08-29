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


export function listing_facet_names(view) {
  /** Facets to chip on an index card: header chips minus version/status and the
   *  open index's group_by. Those are headings (or the listing title), not chips.
   *  The selected tag is dropped later so sibling tags can still show. */
  const spec = facet_config(view) || {}
  const skip = new Set(['version', 'status', spec.group_by].filter(Boolean))
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
