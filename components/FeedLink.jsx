/**
 * Navbar links for the site's post listing and optional RSS subscription.
 */
import Link from 'next/link'
import { useRouter } from 'next/router'
import siteConfig from '../site.config'


const RSS_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="6.18" cy="17.82" r="2.18" />
    <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" />
  </svg>
)


export default function FeedLink() {
  const { basePath } = useRouter()
  const section = siteConfig.feed_url && `/${siteConfig.feed_url.replace(/^\/+|\/+$/g, '')}`
  if (!siteConfig.rss && !section) return null
  return (
    <>
      {section && (
        <Link href={section} className="icon-link" aria-label="Feed">
          {siteConfig.rss ? 'Feed' : RSS_ICON}
        </Link>
      )}
      {siteConfig.rss && (
        <a href={`${basePath}/rss.xml`} className="icon-link" aria-label="Subscribe to RSS" title="Subscribe to RSS">
          {RSS_ICON}
        </a>
      )}
    </>
  )
}
