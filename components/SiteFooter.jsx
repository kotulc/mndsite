/**
 * Site footer: icon, credits, and build timestamp.
 * Edit this file to customize the footer that appears on every page.
 */
import siteConfig from '../site.config'


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
