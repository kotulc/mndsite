import siteConfig from '../site.config'
import { normalize_tags } from './feed/card-meta.mjs'
import { single } from './useListingSearch'

export function pageLabelOptions(chipLists) {
  const options = new Map()
  for (const chips of chipLists) {
    for (const { facet, term } of chips) {
      if (!options.has(facet)) options.set(facet, new Set())
      options.get(facet).add(term)
    }
  }
  return options
}

export function pageLabelSelection(query) {
  const facet = single(query.facet) || 'tags'
  const raw = single(query.tag)
  const tag = facet === 'tags' ? normalize_tags([raw])[0] : raw
  return { facet, tag, key: tag ? JSON.stringify([facet, tag]) : '' }
}

export default function PageLabelFilter({ options, selection, update }) {
  const { facet, tag, key } = selection
  return <select aria-label="Filter pages by label" value={key} onChange={event => {
    const [field, label] = event.target.value ? JSON.parse(event.target.value) : ['', '']
    update({ facet: field === 'tags' ? '' : field, tag: label })
  }}>
    <option value="">All labels</option>
    {key && !options.get(facet)?.has(tag) && <option value={key}>{tag}</option>}
    {[...options].map(([field, values]) => <optgroup key={field} label={siteConfig.frontmatter.facets[field].label}>
      {[...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(value =>
        <option key={value} value={JSON.stringify([field, value])}>{value}</option>)}
    </optgroup>)}
  </select>
}
