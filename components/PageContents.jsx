/**
 * The right sidebar's body, reused verbatim by the inline Contents panel: page
 * description, in-page sections, Related links, and "Edit this page", rendered in the
 * order of the display list handed to it (`display.toc` or `display.contents`).
 *
 * Above the xl breakpoint Nextra owns the sidebar's heading list and its scroll-spy, so
 * the sidebar slots are adapters: TocTitle puts the description above Nextra's "On This
 * Page" label, TocExtra renders whatever Nextra did not. Below xl the whole list renders
 * inline — see components/ContentsMenu.jsx.
 */
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSection, find_page, section_anchor } from './SectionContext'
import { active_view } from './filters'
import siteConfig from '../site.config'


const FACET_QUERY_KEYS = ['view', 'field', 'on']


function without_facet_query(query) {
  const next = { ...query }
  for (const key of FACET_QUERY_KEYS) delete next[key]
  return next
}


function use_contents_navigate(on_close) {
  const router = useRouter()

  function dismiss() {
    on_close?.()
  }

  function clear_facet_view() {
    if (active_view(router.query) === 'pages') return Promise.resolve()
    const query = without_facet_query(router.query)
    return router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false })
  }

  function navigate_to_section(e, id) {
    e.preventDefault()
    dismiss()
    clear_facet_view().then(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  return { navigate_to_section }
}

// Longest entry name rendered in full; past this, Sections and Related elide. Sized to
// one line of a panel column (12rem) so a capped name never wraps.
const NAME_CAP = 26


export function cap_name(name) {
  /** Elide a long entry name, breaking on the last whole word that fits. */
  const text = String(name || '')
  if (text.length <= NAME_CAP) return text
  return `${text.slice(0, NAME_CAP).replace(/\s+\S*$/, '')}…`
}


export function edit_href(page) {
  /** Edit target for a page: the repo copy of the file it was built from. Requires
   *  repo_url; falls back to the repo root for unknown hosts or generated pages. */
  const { repo_url, edit } = siteConfig
  if (!repo_url) return ''

  const root = repo_url.replace(/\/+$/, '')
  const source = (page && page.source) || ''
  if (!edit || !edit.url || !source) return root

  const file = [edit.path, source].filter(Boolean).join('/')
  return edit.url
    .replace('{repo_url}', root)
    .replace('{branch}', edit.branch)
    .replace('{path}', edit.path)
    .replace('{source}', source)
    .replace('{file}', file)
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
    items.push({ href: r.url, name: r.name, external: false })
  }

  return items
}


export function contents_items(order, page, sections) {
  /** The listed elements that actually have something to show on this page. */
  if (!page) return []
  return order.filter(item => {
    if (item === 'description') return !!page.desc
    if (item === 'sections') return !!sections.length
    if (item === 'related') return !!related_items(page).length
    if (item === 'edit') return !!edit_href(page)
    return false
  })
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


function Sections({ sections, navigate_to_section }) {
  return (
    <div className="page-contents-block">
      <Label>On This Page</Label>
      <ul className="page-contents-list">
        {sections.map((section, i) => {
          const id = section_anchor(section.name)
          return (
            <li key={`${section.name}-${i}`} className={section.level >= 3 ? 'page-contents-sub' : undefined}>
              <a
                href={`#${id}`}
                title={section.name}
                onClick={(e) => navigate_to_section(e, id)}
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


function Related({ page }) {
  return (
    <div className="page-contents-block">
      <Label>Related</Label>
      <div className="page-contents-links">
        {related_items(page).map(({ href, name, external }) => (
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


function EditLink({ page }) {
  return (
    <div className="page-contents-block">
      <Label>Source</Label>
      <a href={edit_href(page)} target="_blank" rel="noopener noreferrer" className="page-contents-edit">
        Edit this page
      </a>
    </div>
  )
}


export default function PageContents({ order, on_navigate, page: page_override, sections: sections_override }) {
  const ctx = useSection()
  const page = page_override ?? ctx.page
  const sections = sections_override ?? ctx.sections
  const { navigate_to_section } = use_contents_navigate(on_navigate)
  const items = contents_items(order, page, sections)
  if (!items.length) return null

  return (
    <div className="page-contents">
      {items.map(item => {
        if (item === 'description') return <Description key={item} page={page} />
        if (item === 'sections') return <Sections key={item} sections={sections} navigate_to_section={navigate_to_section} />
        if (item === 'related') return <Related key={item} page={page} />
        return <EditLink key={item} page={page} />
      })}
    </div>
  )
}


const TOC_ORDER = siteConfig.display.toc
const TOC_TAIL = TOC_ORDER.filter(item => item === 'related' || item === 'edit')
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
