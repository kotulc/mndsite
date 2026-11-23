/** Next.js custom App wrapper — imports global styles and any providers. */
import '../styles/global.css'
import '../components/feed/feed.css'
import Head from 'next/head'
import { useLayoutEffect } from 'react'
import { SectionProvider } from '../components/SectionContext'
import siteConfig from '../site.config'


function set_chrome_dataset(root, name, value) {
  if (!value) delete root.dataset[name]
  else root.dataset[name] = value
}


function apply_chrome_datasets() {
  const root = document.documentElement
  set_chrome_dataset(root, 'chromeNavbar', siteConfig.theme.navbar)
  set_chrome_dataset(root, 'chromeFooter', siteConfig.theme.footer)
}


export default function App({ Component, pageProps }) {
  useLayoutEffect(apply_chrome_datasets, [])

  return (
    <SectionProvider>
      {siteConfig.rss && (
        <Head>
          <link rel="alternate" type="application/rss+xml" title={siteConfig.title}
            href={new URL('rss.xml', siteConfig.rss.site_url).href} />
        </Head>
      )}
      <Component {...pageProps} />
    </SectionProvider>
  )
}
