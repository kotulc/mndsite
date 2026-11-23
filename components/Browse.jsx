import Link from 'next/link'
import siteMeta from '../public/site-meta.json'
import siteConfig from '../site.config'
import TagList from './TagList'
import { group_chips } from './facets'
import { normalize_tags } from './feed/card-meta.mjs'
import { single, useListingSearch } from './useListingSearch'

const options = new Map()
const pages = siteMeta.pages.map(page => {
  const chips = group_chips(page.facets)
  const filters = new Set()
  for (const { facet, term } of chips) {
    if (!options.has(facet)) options.set(facet, new Set())
    options.get(facet).add(term)
    filters.add(JSON.stringify([facet, term]))
  }
  const searchable = [page.name, page.url, page.desc, page.excerpt, ...chips.map(chip => chip.term)]
    .filter(Boolean).join(' ').toLowerCase()
  return { page, chips, filters, searchable }
}).sort((a, b) => a.page.name.localeCompare(b.page.name))

export default function Browse() {
  const { query, text, search, setText, changeText, update } = useListingSearch()
  const facet = single(query.facet) || 'tags'
  const raw = single(query.tag)
  const tag = facet === 'tags' ? normalize_tags([raw])[0] : raw
  const selected = tag ? JSON.stringify([facet, tag]) : ''
  const term = text.trim().toLowerCase()
  const matches = pages.filter(row => (!selected || row.filters.has(selected)) && row.searchable.includes(term))

  function select(value) {
    const [field, label] = value ? JSON.parse(value) : ['', '']
    update({ facet: field === 'tags' ? '' : field, tag: label })
  }

  return <section aria-label="Browse published pages">
    <div className="feed-controls">
      <input ref={search} type="search" aria-label="Search pages" placeholder="Search pages"
        value={text} onChange={event => changeText(event.target.value)} />
      <select aria-label="Filter pages by label" value={selected} onChange={event => select(event.target.value)}>
        <option value="">All labels</option>
        {selected && !options.get(facet)?.has(tag) && <option value={selected}>{tag}</option>}
        {[...options].map(([field, values]) => <optgroup key={field} label={siteConfig.frontmatter.facets[field].label}>
          {[...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(value =>
            <option key={value} value={JSON.stringify([field, value])}>{value}</option>)}
        </optgroup>)}
      </select>
      {(selected || text) && <button type="button" onClick={() => {
        setText('')
        update({ q: '', facet: '', tag: '' })
      }}>Clear</button>}
      <span role="status" className="feed-count">{matches.length} {matches.length === 1 ? 'page' : 'pages'}</span>
    </div>
    {!matches.length && <p className="feed-empty">{pages.length ? 'No pages match these filters.' : 'No published pages yet.'}</p>}
    <ul className="browse-results">
      {matches.map(({ page, chips }) => <li className="browse-result" key={page.url}>
        <Link href={page.url}>{page.name}</Link>
        {(page.desc || page.excerpt) && <p>{page.desc || page.excerpt}</p>}
        <TagList tags={chips} />
      </li>)}
    </ul>
  </section>
}
