import Link from 'next/link'
import siteMeta from '../public/site-meta.json'
import TagList from './TagList'
import { group_chips } from './facets'
import PageLabelFilter, { pageLabelOptions, pageLabelSelection } from './PageLabelFilter'
import { usePageSearchIndex } from './useListingSearch'
import { useSiteSearch } from './SiteSearch'

const pages = siteMeta.pages.map(page => {
  const chips = group_chips(page.facets)
  const filters = new Set(chips.map(({ facet, term }) => JSON.stringify([facet, term])))
  const searchable = [page.name, page.url, page.desc, page.excerpt, ...chips.map(chip => chip.term)]
    .filter(Boolean).join(' ')
  return { page, chips, filters, searchable }
})
const options = pageLabelOptions(pages.map(row => row.chips))
pages.sort((a, b) => a.page.name.localeCompare(b.page.name))

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlight(value, pattern) {
  if (!pattern) return value
  return String(value).split(pattern).map((part, i) =>
    i % 2 ? <mark key={i}>{part}</mark> : part)
}

function matchExcerpt(text, match) {
  const matchEnd = match.index + match[0].length
  let start = Math.max(0, match.index - 75)
  let end = Math.min(text.length, matchEnd + 105)
  if (start > 0) {
    const boundary = text.indexOf(' ', start)
    if (boundary >= 0 && boundary < match.index) start = boundary + 1
  }
  if (end < text.length) {
    const boundary = text.lastIndexOf(' ', end)
    if (boundary >= matchEnd) end = boundary
  }
  return (start ? '… ' : '') + text.slice(start, end) + (end < text.length ? ' …' : '')
}

function SearchResult({ page, chips, body, phrase, highlights }) {
  let excerpt = page.desc || page.excerpt
  if (phrase && !(page.desc && phrase.test(page.desc))) {
    const bodyMatch = body && phrase.exec(body)
    if (bodyMatch) excerpt = matchExcerpt(body, bodyMatch)
    else if (page.excerpt && phrase.test(page.excerpt)) excerpt = page.excerpt
  }

  const showPath = phrase?.test(page.url) && !phrase.test(page.name) &&
    !(excerpt && phrase.test(excerpt)) && !chips.some(chip => phrase.test(chip.term))
  const renderLabel = value => highlight(value, highlights)
  return <li className="browse-result">
    <Link href={page.url}>{renderLabel(page.name)}</Link>
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
  const phrase = term ? new RegExp(escapePattern(term), 'iu') : null
  const highlights = term ? new RegExp('(' + term.split(/\s+/).map(escapePattern).join('|') + ')', 'iu') : null
  const matches = pages.filter(row => (!selection.key || row.filters.has(selection.key)) &&
    (!phrase || phrase.test(row.searchable) || phrase.test(content?.[row.page.url] || '')))

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
