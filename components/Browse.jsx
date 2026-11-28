import Link from 'next/link'
import siteMeta from '../public/site-meta.json'
import TagList from './TagList'
import { group_chips } from './facets'
import PageLabelFilter, { pageLabelOptions, pageLabelSelection } from './PageLabelFilter'
import { usePageSearchIndex } from './useListingSearch'
import { useSiteSearch } from './SiteSearch'
import { highlight, matchesPageSearch, pageSearchMatch, searchHighlights, searchPhrase, sectionSearchLabel } from './searchExcerpt'

const pages = siteMeta.pages.map(page => {
  const chips = group_chips(page.facets)
  const filters = new Set(chips.map(({ facet, term }) => JSON.stringify([facet, term])))
  const searchable = [page.name, page.url, page.desc, page.excerpt, ...chips.map(chip => chip.term)]
    .filter(Boolean).join(' ')
  return { page, chips, filters, searchable }
})
const options = pageLabelOptions(pages.map(row => row.chips))
pages.sort((a, b) => a.page.name.localeCompare(b.page.name))

function SearchResult({ page, chips, body, phrase, highlights }) {
  const match = pageSearchMatch(body, phrase)
  let excerpt = page.desc || page.excerpt
  if (match?.card || (phrase && !(page.desc && phrase.test(page.desc)))) {
    if (match) excerpt = match.excerpt
    else if (page.excerpt && phrase.test(page.excerpt)) excerpt = page.excerpt
  }

  const showPath = phrase?.test(page.url) && !phrase.test(page.name) &&
    !(excerpt && phrase.test(excerpt)) && !chips.some(chip => phrase.test(chip.term))
  const renderLabel = value => highlight(value, highlights)
  return <li className="browse-result">
    <Link href={match?.card ? { pathname: page.url, hash: match.card.id } : page.url}>{renderLabel(page.name)}</Link>
    {match?.card && <p>{renderLabel(sectionSearchLabel(match.card))}</p>}
    {showPath && <p>{renderLabel(page.url)}</p>}
    {excerpt && <p>{renderLabel(excerpt)}</p>}
    <TagList tags={chips} renderLabel={highlights ? renderLabel : undefined} />
  </li>
}

export default function Browse() {
  const { basePath, query, text, update } = useSiteSearch()
  const term = text.trim()
  const searching = !!term
  const content = usePageSearchIndex(basePath, searching)
  const selection = pageLabelSelection(query)
  const phrase = searchPhrase(term)
  const highlights = searchHighlights(term)
  const matches = pages.filter(row => (!selection.key || row.filters.has(selection.key)) &&
    (!phrase || phrase.test(row.searchable) || matchesPageSearch(content?.[row.page.url], phrase)))

  return <section aria-label="Pages">
    <div className="feed-controls">
      <PageLabelFilter options={options} selection={selection} update={update} />
      {(selection.key || text) && <button type="button" onClick={() =>
        update({ q: '', facet: '', tag: '' })}>Clear</button>}
      <span role="status" className="feed-count">{searching && content === null ? 'Searching…' :
        `${matches.length} ${matches.length === 1 ? 'page' : 'pages'}`}</span>
    </div>
    {searching && content === false && <p className="feed-empty">Page content is unavailable. Results use page details and labels.</p>}
    {!matches.length && (!searching || content !== null) &&
      <p className="feed-empty">{pages.length ? 'No matching pages.' : 'No published pages yet.'}</p>}
    <ul className="browse-results">
      {matches.map(({ page, chips }) => <SearchResult key={page.url} page={page} chips={chips}
        body={content?.[page.url]} phrase={phrase} highlights={highlights} />)}
    </ul>
  </section>
}
