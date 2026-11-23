import Link from 'next/link'
import { useRouter } from 'next/router'
import { find_page } from './SectionContext'
import siteConfig from '../site.config'

function route_label(href, slug) {
  return find_page(href)?.name || slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function Breadcrumbs({ heading }) {
  const { route } = useRouter()
  if (!siteConfig.display.crumbs) return null

  const parts = route.split('/').filter(Boolean)
  const items = [{ href: '/', name: siteConfig.title }]
  for (const [index, slug] of parts.entries()) {
    const href = '/' + parts.slice(0, index + 1).join('/')
    const name = index === parts.length - 1 && typeof heading === 'string'
      ? find_page(href)?.name || heading
      : route_label(href, slug)
    items.push({ href, name })
  }

  return (
    <nav className="page-crumbs" aria-label="Breadcrumb">
      <ol>
        {items.map(({ href, name }, index) => (
          <li key={href}>
            {index > 0 && <span aria-hidden="true">/</span>}
            {index === items.length - 1
              ? <span aria-current="page">{name}</span>
              : <Link href={href}>{name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
