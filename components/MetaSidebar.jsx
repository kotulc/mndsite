/**
 * Right ToC sidebar panel, rendered via theme.config.jsx's toc.extraContent, below
 * Nextra's own "On This Page" heading list: a combined "Related" list (the page's own
 * outbound links, resolved to the linked page's name where possible, plus ingest
 * `related` pages), then the edit-this-page link — always last, since Nextra renders
 * editLink before extraContent (theme.config.jsx disables Nextra's own copy to make
 * this so). Description and section tags now live in the PageInfo panel below the page
 * header instead (see components/PageInfo.jsx); keywords/metrics are not shown for now.
 */
import Link from 'next/link'
import { useSection, find_page } from './SectionContext'
import siteConfig from '../site.config'

function Label({ children }) {
  return <p className="panel-label">{children}</p>
}

function RelatedLink({ href, name, external }) {
  if (external) {
    return (
      <div className="related-link">
        <a href={href} target="_blank" rel="noopener noreferrer">{name}</a>
      </div>
    )
  }
  return <div className="related-link"><Link href={href}>{name}</Link></div>
}

function EditLink() {
  if (!siteConfig.repo_url) return null
  return (
    <a href={siteConfig.repo_url} target="_blank" rel="noopener noreferrer" className="meta-sidebar-edit">
      Edit this page
    </a>
  )
}

function external_label(href) {
  try { return new URL(href).hostname.replace(/^www\./, '') }
  catch { return href }
}

function related_items(page) {
  /** Build Related entries: resolved internal links, intentional external links, then related[]. */
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

export default function MetaSidebar() {
  const { page } = useSection()
  if (!page) return null

  const items = related_items(page)
  const has_edit = !!siteConfig.repo_url
  if (!items.length && !has_edit) return null

  return (
    <div className="meta-sidebar-content">
      {!!items.length && (
        <div className="meta-sidebar-section">
          <Label>Related</Label>
          {items.map(item => (
            <RelatedLink key={item.href} href={item.href} name={item.name} external={item.external} />
          ))}
        </div>
      )}

      <EditLink />
    </div>
  )
}
