/**
 * Breadcrumb trail above the page title, replacing Nextra's own (hidden in global.css)
 * so every page carries the same trail — Nextra drops it on root-level pages, which left
 * the title area jumping around. When display.crumbs is true, the trail links Home and
 * each ancestor directory; the current page is the heading directly below, so the trail
 * never repeats it. display.crumbs: false turns the trail off.
 */
import { Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { find_page } from './SectionContext'
import siteConfig from '../site.config'


function dir_label(slug) {
  /** Label for a directory segment — no page record exists for a generated index. */
  return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}


function path_trail(route) {
  /** Ancestor directories of the current page, outermost first. */
  const parts = route.split('/').filter(Boolean).slice(0, -1)
  return parts.map((part, i) => {
    const href = `/${parts.slice(0, i + 1).join('/')}`
    const page = find_page(href)
    return { href, name: page ? page.name : dir_label(part) }
  })
}


export default function Breadcrumbs() {
  if (!siteConfig.display.crumbs) return null

  const { route } = useRouter()
  const items = [{ href: '/', name: 'Home' }, ...path_trail(route)]
  if (!items.length) return null

  return (
    <nav className="page-crumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <Fragment key={item.href}>
          {i > 0 && <span className="page-crumb-sep" aria-hidden="true">›</span>}
          <Link className="page-crumb" href={item.href}>{item.name}</Link>
        </Fragment>
      ))}
    </nav>
  )
}
