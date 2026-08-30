/**
 * Body listing for an open facet index.
 * Each hit is a page card: title, date/reading time, leftover chips, first paragraph.
 * Shown instead of the article while view is not Pages.
 */
import Link from 'next/link'
import { useRouter } from 'next/router'
import siteConfig from '../site.config'
import PageHeader from './PageHeader'
import { PageCrumbRow, PageHeading } from './PageChrome'
import TagList from './TagList'
import { group_chips, group_values, listing_field_keys, sidebar_group } from './groups'
import { active_field, active_view, listed_pages, selected_value } from './filters'


function IndexBreadcrumbs({ group }) {
  const order = siteConfig.display.crumbs || []
  if (!order.length) return null

  return (
    <nav className="page-crumbs" aria-label="Breadcrumb">
      {order.includes('home') && (
        <>
          <Link className="page-crumb" href="/">Home</Link>
          <span className="page-crumb-sep" aria-hidden="true">›</span>
        </>
      )}
      <span className="page-crumb" aria-current="page">{group.label}</span>
    </nav>
  )
}


function group_pages(pages, group_by) {
  if (!group_by) return [{ group: '', pages }]
  const buckets = new Map()
  for (const page of pages) {
    const key = group_values((page.facets || {})[group_by])[0] || ''
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(page)
  }
  const keys = [...buckets.keys()].sort((a, b) => {
    if (!a) return 1
    if (!b) return -1
    return String(a).localeCompare(String(b))
  })
  return keys.map(group => ({ group, pages: buckets.get(group) }))
}


function ResultCard({ page, view, field, selected }) {
  const header = siteConfig.display.header
  const chips = group_chips(page.facets, listing_field_keys(view, field))
    .filter(chip => !(chip.group === field && chip.term === selected))
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


function ResultGroup({ group, pages, view, field, selected }) {
  return (
    <section className="index-listing-group">
      {group ? <h2 className="index-listing-group-label">{group}</h2> : null}
      <div className="index-listing-results">
        {pages.map(page => (
          <ResultCard key={page.url} page={page} view={view} field={field} selected={selected} />
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
  const field = active_field(query, view)
  const value = selected_value(query, view)
  const pages = listed_pages(view, field, value)
  const versioning = siteConfig.versioning
  const group_by = group && group.versioning && versioning ? versioning.group_by : ''
  const groups = group_pages(pages, group_by)
  const label = value === 'latest' ? 'Latest' : value
  const count = pages.length === 1 ? '1 page' : `${pages.length} pages`

  return (
    <>
      <PageCrumbRow>
        <IndexBreadcrumbs group={group} />
      </PageCrumbRow>
      <PageHeading>{label}</PageHeading>
      <div className="page-header">
        <span>{count}</span>
      </div>
      {!pages.length && <p className="index-listing-empty">No pages for this value.</p>}
      <div className="index-listing">
        {groups.map(({ group: heading, pages: hits }) => (
          <ResultGroup
            key={heading || 'all'}
            group={heading}
            pages={hits}
            view={view}
            field={field}
            selected={value}
          />
        ))}
      </div>
    </>
  )
}
