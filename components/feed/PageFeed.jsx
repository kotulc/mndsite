import Link from 'next/link'
import { useState } from 'react'
import siteMeta from '../../public/site-meta.json'
import siteConfig from '../../site.config'
import { group_chips } from '../facets'
import PageLabelFilter, { pageLabelOptions, pageLabelSelection } from '../PageLabelFilter'
import { usePageSearchIndex } from '../useListingSearch'
import { useSiteSearch } from '../SiteSearch'
import { highlight, pageSearchMatch, pageSearchText, searchHighlights, searchPhrase } from '../searchExcerpt'
import { FacetChip, FeedCard } from './FeedCard'

const pages = siteMeta.pages.filter(page => page.url !== '/').map(page => {
  const labels = group_chips(page.facets)
  return {
    ...page,
    labels,
    preview: page.desc || page.excerpt,
    searchable: [page.name, page.url, page.desc, page.excerpt, ...labels.map(label => label.term)]
      .filter(Boolean).join(' ').toLowerCase(),
    chips: labels.map(({ facet, term }) => {
      const { label, hue } = siteConfig.frontmatter.facets[facet]
      return { name: facet, value: term, label, hue }
    }),
  }
})
const options = pageLabelOptions(pages.map(page => page.labels))
const sidebarRank = new Map((siteMeta.reading_order || []).map((url, i) => [url, i]))
const readingOrder = [...pages].sort((a, b) =>
  (sidebarRank.get(a.url) ?? sidebarRank.size) - (sidebarRank.get(b.url) ?? sidebarRank.size) ||
  a.url.localeCompare(b.url))
const newestFirst = [...pages].sort((a, b) =>
  (b.published || '').localeCompare(a.published || '') || a.url.localeCompare(b.url))
const oldestFirst = [...pages].sort((a, b) =>
  Number(!a.published) - Number(!b.published) ||
  (a.published || '').localeCompare(b.published || '') || a.url.localeCompare(b.url))
const sortOrders = { '': readingOrder, newest: newestFirst, oldest: oldestFirst }

export default function PageFeed() {
  const [expanded, setExpanded] = useState(null)
  const { basePath, query, text, update } = useSiteSearch()
  const selection = pageLabelSelection(query)
  const sort = query.sort === 'newest' || query.sort === 'oldest' ? query.sort : ''
  const term = text.trim().toLowerCase()
  const phrase = searchPhrase(term)
  const highlights = searchHighlights(term)
  const content = usePageSearchIndex(basePath, !!term)
  const searching = !!term && content === null
  const visible = sortOrders[sort].filter(page =>
    (!selection.key || page.chips.some(chip => chip.name === selection.facet && chip.value === selection.tag)) &&
    (!term || page.searchable.includes(term) || phrase.test(pageSearchText(content?.[page.url]))))

  return <section className="page-feed" aria-label="Page feed">
    <div className="feed-controls" role="group" aria-label="Filter page feed">
      {(options.size > 0 || selection.key) && <PageLabelFilter options={options} selection={selection} update={update} />}
      <select aria-label="Sort pages" value={sort} onChange={event => update({ sort: event.target.value })}>
        <option value="">Reading order</option>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
      {(text || selection.key || sort) && <button type="button" onClick={() =>
        update({ q: '', facet: '', tag: '', sort: '' })}>Clear</button>}
      <span role="status" className="feed-count">{searching ? 'Searching…' :
        `${visible.length} ${visible.length === 1 ? 'page' : 'pages'}`}</span>
    </div>
    {term && content === false && <p className="feed-empty">Page content is unavailable. Results use page details and labels.</p>}
    {!visible.length && !searching &&
      <p className="feed-empty">{pages.length ? 'No pages match these filters.' : 'No published pages yet.'}</p>}
    {visible.length > 0 && (
      <div className="mnd-feed">
        {visible.map(page => {
          const match = pageSearchMatch(content?.[page.url], phrase)
          const preview = highlight(match?.excerpt || page.preview, highlights)
          const href = match?.card ? { pathname: page.url, hash: match.card.id } : undefined
          return <FeedCard key={page.url} title={page.name} excerpt={preview} preview={preview}
            href={href}
            open={expanded === page.url}
            toggle={() => setExpanded(current => current === page.url ? null : page.url)}
            meta={<>
              {match?.card ? <span>{highlight(match.card.title, highlights)}</span> : <>
                {page.published && <time className="mnd-feed-publication" dateTime={page.published}>{page.published}</time>}
                {page.metrics?.reading_time && <span className="mnd-feed-meta-item">{page.metrics.reading_time} min read</span>}
              </>}
            </>}
            tags={page.chips.length > 0 && <span className="mnd-feed-tags">
              {page.chips.map(chip => <FacetChip key={JSON.stringify([chip.name, chip.value])} facet={chip} />)}
            </span>}
            badge={<span className={href ? 'mnd-feed-chevron page-feed-chevron-link' : 'mnd-feed-chevron'} aria-hidden="true" />}>
            <Link href={page.url} aria-label={`Read ${page.name}`}>Read page</Link>
          </FeedCard>
        })}
      </div>
    )}
  </section>
}
