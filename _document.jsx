import { Head, Html, Main, NextScript } from 'next/document'
import siteConfig from '../site.config'

export default function Document() {
  const icon = siteConfig.icon
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  return (
    <Html data-chrome-navbar={siteConfig.theme.navbar || undefined}
      data-chrome-footer={siteConfig.theme.footer || undefined}>
      <Head>
        {icon && <link rel="icon" href={basePath + icon} />}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
