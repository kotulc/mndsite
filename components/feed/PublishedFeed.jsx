import { useRouter } from 'next/router'
import Feed from './Feed'
import entries from '../../public/post-feed.json'
import siteConfig from '../../site.config'

function relative_url(value, from) {
  try {
    const url = new URL(value, 'https://mndsite.invalid/' + from)
    return url.origin === 'https://mndsite.invalid' ? url : null
  } catch {
    return null
  }
}

export default function PublishedFeed() {
  const { basePath } = useRouter()
  return <Feed
    entries={entries.map(entry => ({ ...entry, href: basePath + entry.href + '/' }))}
    defaultSource={siteConfig.title}
    resolveImage={(value, entry) => {
      const url = relative_url(value, entry.path)
      if (!url) return undefined
      const asset = url.pathname.indexOf('/_assets/')
      const images = url.pathname.lastIndexOf('/images/')
      if (asset >= 0) return basePath + url.pathname.slice(asset)
      if (images >= 0) return basePath + '/images' + url.pathname.slice(0, images) + url.pathname.slice(images + 7)
      return url.pathname.startsWith('/assets/') ? basePath + url.pathname : undefined
    }}
    resolveLink={(value, entry) => {
      const url = relative_url(value, entry.path)
      if (!url) return undefined
      return basePath + (value.startsWith('#') ? entry.href.slice(basePath.length) : url.pathname.replace(/\.(?:mdx?|html)$/i, '/')) + url.search + url.hash
    }}
  />
}
