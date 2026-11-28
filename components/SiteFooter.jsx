/**
 * Site footer: icon, credits, and build timestamp.
 * Edit this file to customize the footer that appears on every page.
 */
import Link from 'next/link'
import siteConfig from '../site.config'

export function SiteFooterLayout() {
  return (
    <>
      {siteConfig.support && (
        <div className="support-banner">
          <Link href={siteConfig.support.url}>{siteConfig.support.title}</Link>
        </div>
      )}
      <footer className="nx-bg-gray-100 nx-pb-[env(safe-area-inset-bottom)] dark:nx-bg-neutral-900 print:nx-bg-transparent">
        <hr className="dark:nx-border-neutral-800" />
        <div className="nx-mx-auto nx-flex nx-max-w-[90rem] nx-justify-center nx-py-12 nx-pl-[max(env(safe-area-inset-left),1.5rem)] nx-pr-[max(env(safe-area-inset-right),1.5rem)]">
          <SiteFooter />
        </div>
      </footer>
    </>
  )
}


export default function SiteFooter() {
  const build_time = process.env.NEXT_PUBLIC_BUILD_TIME
  const formatted = build_time
    ? new Date(build_time).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
      })
    : null
  return (
    <div className="site-footer">
      {siteConfig.icon && (
        <img className="site-footer-icon" src={(process.env.NEXT_PUBLIC_BASE_PATH || '') + siteConfig.icon}
          width="44" height="44" alt="" />
      )}
      <span>
        {siteConfig.footer || (
          <>
            Powered by{' '}
            <a href="https://github.com/kotulc/mndsite" target="_blank" rel="noopener noreferrer">mndsite</a>
            {' '}and{' '}
            <a href="https://nextra.site" target="_blank" rel="noopener noreferrer">Nextra</a>
          </>
        )}
      </span>
      {formatted && (
        <time className="site-footer-updated" dateTime={build_time}>Updated {formatted}</time>
      )}
    </div>
  )
}
