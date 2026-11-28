/**
 * The right sidebar's page metadata, recent posts, and site links.
 *
 * Above the xl breakpoint Nextra owns the sidebar's heading list and its scroll-spy, so
 * the sidebar slots are adapters: TocTitle puts the description above Nextra's "On This
 * Page" label, TocExtra renders whatever Nextra did not.
 */
import Link from 'next/link'
import { useSection, find_page } from './SectionContext'
import siteConfig from '../site.config'
import siteMeta from '../public/site-meta.json'


// Longest entry name rendered in full; past this, Sections and Related elide. Sized to
// one line of a panel column (12rem) so a capped name never wraps.
const NAME_CAP = 26


export function cap_name(name) {
  /** Elide a long entry name, breaking on the last whole word that fits. */
  const text = String(name || '')
  if (text.length <= NAME_CAP) return text
  return `${text.slice(0, NAME_CAP).replace(/\s+\S*$/, '')}…`
}


function external_label(href) {
  try { return new URL(href).hostname.replace(/^www\./, '') }
  catch { return href }
}


function related_items(page) {
  /** Related entries: resolved internal links, intentional external links, then related[]. */
  const items = []
  const seen = new Set()

  for (const href of page.links || []) {
    const linked = find_page(href)
    if (linked) {
      if (seen.has(linked.url)) continue
      seen.add(linked.url)
      items.push({ href: linked.url, name: linked.name, external: false })
      continue
    }
    if (/^https?:\/\//i.test(href)) {
      if (seen.has(href)) continue
      seen.add(href)
      items.push({ href, name: external_label(href), external: true })
    }
    // Fragments / unresolved internals are dropped — not useful in Related
  }

  for (const r of page.related || []) {
    if (!r?.url || seen.has(r.url)) continue
    seen.add(r.url)
    items.push({ href: r.url, name: r.name, external: /^https?:\/\//i.test(r.url) })
  }

  return items
}


function Label({ children }) {
  return <p className="panel-label">{children}</p>
}


function Description({ page }) {
  return (
    <div className="page-contents-block page-contents-summary">
      <Label>Description</Label>
      <p className="page-contents-desc">{page.desc}</p>
    </div>
  )
}


function Sections({ sections, on_navigate }) {
  return (
    <div className="page-contents-block">
      <Label>On This Page</Label>
      <ul className="page-contents-list">
        {sections.map((section, i) => {
          const id = section.id
          return (
            <li key={`${section.name}-${i}`} className={section.level >= 3 ? 'page-contents-sub' : undefined}>
              <a
                href={`#${id}`}
                title={section.name}
                onClick={on_navigate}
              >
                {cap_name(section.name)}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}


function SidebarLinks({ label, links }) {
  return (
    <div className="page-contents-block">
      <Label>{label}</Label>
      <div className="page-contents-links">
        {links.map(({ href, name, external }) => (
          <div key={href} className="related-link">
            {external
              ? <a href={href} title={name} target="_blank" rel="noopener noreferrer">{cap_name(name)}</a>
              : <Link href={href} title={name}>{cap_name(name)}</Link>}
          </div>
        ))}
      </div>
    </div>
  )
}


export default function PageContents({ order, on_navigate }) {
  const { page, sections } = useSection()
  if (!page) return null

  const related = order.includes('related') ? related_items(page) : []
  const relatedPages = related.filter(item => !item.external)
  const relatedLinks = new Map(related.filter(item => item.external).map(item => [item.href, item]))
  for (const link of siteConfig.related_links || []) {
    relatedLinks.set(link.href, { ...link, external: /^https?:\/\//i.test(link.href) })
  }
  const posts = siteMeta.recent_posts || []
  const items = order.flatMap(item => {
    if (item === 'description' && page.desc) return <Description key={item} page={page} />
    if (item === 'sections' && sections.length) return <Sections key={item} sections={sections} on_navigate={on_navigate} />
    if (item === 'related' && relatedPages.length) return <SidebarLinks key={item} label="Related Pages" links={relatedPages} />
    return []
  })
  if (!items.length && !relatedLinks.size && !posts.length) return null

  return (
    <div className="page-contents">
      {items}
      {relatedLinks.size > 0 && <SidebarLinks label="Related Links" links={[...relatedLinks.values()]} />}
      {posts.length > 0 && <SidebarLinks label="Recent Posts" links={posts} />}
    </div>
  )
}


const TOC_ORDER = siteConfig.display.toc
const TOC_TAIL = TOC_ORDER.filter(item => item === 'related')
const TOC_NO_HEADINGS = TOC_ORDER.filter(item => item !== 'sections')


export function TocTitle() {
  /** Sidebar heading slot: the page description above Nextra's "On This Page" label. */
  const { page } = useSection()
  const desc = TOC_ORDER.includes('description') && page && page.desc
  // Spans, not the block markup above: Nextra wraps this slot in its own <p>
  return (
    <>
      {desc && (
        <>
          <span className="panel-label">Description</span>
          <span className="page-contents-desc">{desc}</span>
        </>
      )}
      <span className="panel-label page-contents-heading">On This Page</span>
    </>
  )
}


export function TocHeading({ children }) {
  /** Nextra's sidebar heading slot, capped the way our own lists are. */
  if (typeof children !== 'string') return children
  return <span title={children}>{cap_name(children)}</span>
}


export function TocExtra() {
  /** Sidebar tail slot: what Nextra does not render — everything, on a page with no
   *  headings, since Nextra then drops its title slot (and with it the description). */
  const { sections } = useSection()
  return <PageContents order={sections.length ? TOC_TAIL : TOC_NO_HEADINGS} />
}
