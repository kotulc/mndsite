/**
 * Right ToC sidebar panel, rendered via theme.config.jsx's toc.extraContent, below
 * Nextra's own "On This Page" heading list: a combined "Related" list (the page's own
 * outbound links, resolved to the linked page's name where possible, plus taggly's
 * related pages), then the edit-this-page link — always last, since Nextra renders
 * editLink before extraContent (theme.config.jsx disables Nextra's own copy to make
 * this so). Description and section tags now live in the PageInfo panel below the page
 * header instead (see components/PageInfo.jsx); keywords/metrics are not shown for now.
 */
import Link from 'next/link'
import { useSection, find_page } from './SectionContext'
import siteConfig from '../site.config'

function Label({ children }) {
  return <p className="meta-sidebar-label">{children}</p>
}

function RelatedLink({ href, name }) {
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

export default function MetaSidebar() {
  const { page } = useSection()
  if (!page) return null

  const links   = page.links || []
  const related = page.related || []

  return (
    <div className="meta-sidebar-content">
      {(!!links.length || !!related.length) && (
        <div className="meta-sidebar-section">
          <Label>Related</Label>
          {links.map(l => {
            const linked = find_page(l)
            return <RelatedLink key={l} href={l} name={linked ? linked.name : l} />
          })}
          {related.map(r => <RelatedLink key={r.url} href={r.url} name={r.name} />)}
        </div>
      )}

      <EditLink />
    </div>
  )
}
