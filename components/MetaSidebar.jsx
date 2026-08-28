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


function EditLink({ page }) {
  const href = edit_href(page)
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="meta-sidebar-edit">
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

  const order = siteConfig.display.toc.filter(item => item === 'related' || item === 'edit')
  const items = order.includes('related')
    ? related_items(page)
    : []
  const has_edit = order.includes('edit') && !!siteConfig.repo_url
  if (!items.length && !has_edit) return null

  return (
    <div className="meta-sidebar-content">
      {order.map(item => {
        if (item === 'related' && items.length) {
          return (
            <div key="related" className="meta-sidebar-section">
              <Label>Related</Label>
              {items.map(link => (
                <RelatedLink key={link.href} href={link.href} name={link.name} external={link.external} />
              ))}
            </div>
          )
        }
        if (item === 'edit') return <EditLink key="edit" page={page} />
        return null
      })}
    </div>
  )
}
