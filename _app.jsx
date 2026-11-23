/** Next.js custom App wrapper — imports global styles and any providers. */
import 'nextra-theme-docs/style.css'
import '../styles/global.css'
import '../components/feed/feed.css'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { browseFilter } from '../components/facets'
import siteMeta from '../public/site-meta.json'
import { useEffect } from 'react'
import siteConfig from '../site.config'


export default function App({ Component, pageProps }) {
  const router = useRouter()
  useEffect(() => {
    const { view, field, on, q } = router.query
    if (!router.isReady || typeof view !== 'string' || view === 'pages') return
    const facets = siteConfig.frontmatter.facets
    const group = Object.keys(facets).find(name =>
      [name, facets[name].label, facets[name].label + 's'].some(label => label.toLowerCase() === view.toLowerCase()))
    const key = typeof field === 'string' ? field : facets[group]?.key[0]
    const filter = key && typeof on === 'string' ? browseFilter(key, on) : null
    router.replace({ pathname: siteMeta.browse, query: { ...filter, ...(typeof q === 'string' && { q }) } })
  }, [router.isReady, router.asPath])


  return (
    <>
      {siteConfig.rss && (
        <Head>
          <link rel="alternate" type="application/rss+xml" title={siteConfig.title}
            href={new URL('rss.xml', siteConfig.rss.site_url).href} />
        </Head>
      )}
      <Component {...pageProps} />
    </>
  )
}
