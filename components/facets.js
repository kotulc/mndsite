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


export function facet_chips(facets, ui = ['chips']) {
  /** Flatten a page's facets into [{ term, group }], in config declaration order. */
  const chips = []
  for (const name of Object.keys(siteConfig.facets || {})) {
    const facet = facet_config(name)
    if (!facet || !ui.includes(facet.ui)) continue
    for (const term of facet_values((facets || {})[name])) chips.push({ term, group: name })
  }
  return chips
}
