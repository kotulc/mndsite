import { useState } from 'react'
import { useRouter } from 'next/router'
import PageHeader from './components/PageHeader'
import TagList from './components/TagList'
import MetaSidebar from './components/MetaSidebar'
import { PageInfoToggle, PageInfoPanel } from './components/PageInfo'
import { TocMenuToggle, TocMenuPanel } from './components/TocMenu'
import SiteFooter from './components/SiteFooter'
import GitHubLink from './components/GitHubLink'
import FeedLink from './components/FeedLink'
import ThemeToggle from './components/ThemeToggle'
import siteConfig from './site.config'
import siteMeta from './public/site-meta.json'


function strip_trailing_slash(path) {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

// Flat site-meta.json → url → page index
const PAGE_INDEX = Object.fromEntries(
  (siteMeta.pages || []).map(p => [strip_trailing_slash(p.url), p])
)


function use_page_meta() {
  /** Page record for the current route from public/site-meta.json. */
  const { route } = useRouter()
  return PAGE_INDEX[strip_trailing_slash(route)] || PAGE_INDEX[route] || {}
}


function PageMeta() {
  /** Renders published date, supplied reading time, and frontmatter tags. */
  const meta = use_page_meta()
  const metrics = meta.metrics || {}
  const mins = siteConfig.reading_time === false ? null : metrics.reading_time
  const chips = Array.isArray(meta.tags) ? meta.tags.slice(0, 8) : []
  return (
    <>
      <PageHeader date={meta.published} reading_time={mins} />
      <TagList tags={chips} />
    </>
  )
}


function bg_rules(selector, value) {
  /** Background override CSS for a configured navbar/footer color ('' | 'primary' | CSS color). */
  if (!value) return ''
  if (value === 'primary') return (
    `${selector}{background:hsl(var(--site-hs) 94%)!important}` +
    `html.dark ${selector}{background:hsl(var(--site-hs) 45%/0.2)!important}`
  )
  return `${selector}{background:${value}!important}`
}


const THEME_CSS = [
  siteConfig.theme.font_stack && `body{font-family:${siteConfig.theme.font_stack}}`,
  bg_rules('.nextra-nav-container-blur', siteConfig.theme.navbar),
  bg_rules('footer.nx-bg-gray-100', siteConfig.theme.footer),
].filter(Boolean).join('')


function PageTitle({ children }) {
  /** Custom h1 override: heading + Info/Contents actions, page metadata, optional panels.
   *  Info and Contents are mutually exclusive — opening one closes the other. */
  const [info_open, set_info_open] = useState(false)
  const [toc_open, set_toc_open] = useState(false)

  function toggle_info() {
    set_info_open(v => !v)
    set_toc_open(false)
  }
  function toggle_toc() {
    set_toc_open(v => !v)
    set_info_open(false)
  }

  return (
    <>
      <div className="page-title-row">
        <h1 className="nx-mt-2 nx-text-4xl nx-font-bold nx-tracking-tight nx-text-slate-900 dark:nx-text-slate-100">{children}</h1>
        <div className="page-title-actions">
          <PageInfoToggle open={info_open} on_toggle={toggle_info} />
          <TocMenuToggle open={toc_open} on_toggle={toggle_toc} />
        </div>
      </div>
      <PageMeta />
      <PageInfoPanel open={info_open} on_close={() => set_info_open(false)} />
      <TocMenuPanel open={toc_open} on_close={() => set_toc_open(false)} />
    </>
  )
}


export default {
  logo: <span style={{ fontWeight: 600 }}>{siteConfig.title}</span>,
  primaryHue: siteConfig.theme.hue,
  primarySaturation: siteConfig.theme.saturation,
  darkMode: siteConfig.theme_toggle !== 'navbar',
  navbar: {
    extraContent: (
      <div className="navbar-icons">
        {siteConfig.theme_toggle === 'navbar' && <ThemeToggle />}
        <FeedLink />
        <GitHubLink />
      </div>
    ),
  },
  footer: { text: <SiteFooter /> },
  useNextSeoProps() {
    const meta = use_page_meta()
    return {
      titleTemplate: `%s – ${siteConfig.title}`,
      description: meta.desc || siteConfig.description || undefined,
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {siteConfig.description && <meta name="description" content={siteConfig.description} />}
      {THEME_CSS && <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />}
    </>
  ),
  feedback: { content: null },
  // Nextra renders editLink before toc.extraContent, so its own copy is disabled here —
  // MetaSidebar renders "Edit this page" itself, last, after Related.
  editLink: { component: () => null },
  toc: siteConfig.toc === false ? { component: () => null } : { extraContent: <MetaSidebar /> },
  components: { h1: PageTitle },
  main: ({ children }) => <>{children}</>,
}
