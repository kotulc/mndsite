/**
 * Body listing for an open facet index.
 * Each hit is a page card: title, date/reading time, leftover chips, first paragraph.
 * Group_by values are section headings, not chips. Shown instead of the article
 * while view is not Pages.
 */
import Link from 'next/link'
import { useRouter } from 'next/router'
import siteConfig from '../site.config'
import PageHeader from './PageHeader'
import TagList from './TagList'
import { facet_chips, facet_config, facet_values, listing_facet_names } from './facets'
import { active_facet, active_view, listed_pages, selected_value, sidebar_group } from './filters'


function group_pages(pages, group_by) {
  if (!group_by) return [{ group: '', pages }]
  const spec = facet_config(group_by)
  const order = (spec && spec.values) || []
  const buckets = new Map()
  for (const page of pages) {
    const key = facet_values((page.facets || {})[group_by])[0] || ''
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(page)
  }
  const keys = [...buckets.keys()].sort((a, b) => {
    if (!a) return 1
    if (!b) return -1
    if (order.length) return order.indexOf(a) - order.indexOf(b)
    return String(a).localeCompare(String(b))
  })
  return keys.map(group => ({ group, pages: buckets.get(group) }))
}


function ResultCard({ page, view, facet, selected }) {
  const header = siteConfig.display.header
  const chips = facet_chips(page.facets, listing_facet_names(view, facet))
    .filter(chip => !(chip.group === facet && chip.term === selected))
  return (
    <Link href={page.url} className="index-card">
      <h3 className="index-card-title">{page.name}</h3>
      <PageHeader
        date={header.includes('date') ? page.published : ''}
        reading_time={header.includes('reading_time') ? (page.metrics || {}).reading_time : null}
        order={header}
      />
      <TagList tags={chips} />
      {page.excerpt ? <p className="index-card-excerpt">{page.excerpt}</p> : null}
    </Link>
  )
}


function ResultGroup({ group, pages, view, facet, selected }) {
  return (
    <section className="index-listing-group">
      {group ? <h2 className="index-listing-group-label">{group}</h2> : null}
      <div className="index-listing-results">
        {pages.map(page => (
          <ResultCard key={page.url} page={page} view={view} facet={facet} selected={selected} />
        ))}
      </div>
    </section>
  )
}


export default function IndexListing({ children }) {
  const { query } = useRouter()
  const view = active_view(query)
  if (view === 'pages') return children

  const group = sidebar_group(view)
  const facet = active_facet(query, view)
  const spec = facet_config(facet) || {}
  const value = selected_value(query, view)
  const pages = listed_pages(facet, value)
  const groups = group_pages(pages, spec.group_by)
  const label = value === 'latest' ? 'Latest' : value
  const count = pages.length === 1 ? '1 page' : `${pages.length} pages`
  const kicker = group ? group.label : (spec.label || facet)

  return (
    <div className="index-listing">
      <header className="index-listing-head">
        <p className="index-listing-kicker">{kicker}</p>
        <h1 className="index-listing-title">{label}</h1>
        <p className="index-listing-count">{count}</p>
      </header>
      {!pages.length && <p className="index-listing-empty">No pages for this value.</p>}
      {groups.map(({ group: heading, pages: hits }) => (
        <ResultGroup
          key={heading || 'all'}
          group={heading}
          pages={hits}
          view={view}
          facet={facet}
          selected={value}
        />
      ))}
    </div>
  )
}
