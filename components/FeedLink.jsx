/**
 * Feed navigation and the subscription link shown on the feed page.
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


const section = siteConfig.feed?.path
const rssUrl = siteConfig.rss && new URL('rss.xml', siteConfig.rss.site_url).href

export default function FeedLink() {
  if (section) return (
    <Link href={section} className="icon-link" aria-label="Feed" title="Open site feed">
      {RSS_ICON}
    </Link>
  )
  if (!rssUrl) return null
  return (
    <a href={rssUrl} className="icon-link" type="application/rss+xml" aria-label="Subscribe to RSS" title="Subscribe to RSS">
      {RSS_ICON}
    </a>
  )
}

export function FeedSubscription() {
  const { pathname } = useRouter()
  if (!rssUrl || pathname !== section) return null
  return <a className="feed-subscribe" href={rssUrl} type="application/rss+xml">Subscribe via RSS</a>
}
