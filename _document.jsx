import { Head, Html, Main, NextScript } from 'next/document'
import siteConfig from '../site.config'

export default function Document() {
  return (
    <Html data-chrome-navbar={siteConfig.theme.navbar || undefined}
      data-chrome-footer={siteConfig.theme.footer || undefined}>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
