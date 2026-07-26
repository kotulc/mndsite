import { useState } from 'react'
import { useRouter } from 'next/router'
import PageHeader from './components/PageHeader'
import TagList from './components/TagList'
import SectionMarker from './components/SectionMarker'
import MetaSidebar from './components/MetaSidebar'
import { PageInfoToggle, PageInfoPanel } from './components/PageInfo'
import SiteFooter from './components/SiteFooter'
import GitHubLink from './components/GitHubLink'
import FeedLink from './components/FeedLink'
import ThemeToggle from './components/ThemeToggle'
import siteConfig from './site.config'
import siteMeta from './public/site-meta.json'


// Flatten the site graph into a url → page-node index once at module load
function index_pages(node, acc = {}) {
  if (node.type === 'page') acc[node.url] = node
  for (const child of node.children || []) index_pages(child, acc)
  return acc
}
const PAGE_INDEX = index_pages(siteMeta)


function use_page_meta() {
  /** Page node for the current route from the generated site graph. */
  const { route } = useRouter()
  return PAGE_INDEX[route] || {}
}


function PageMeta() {
  /** Renders published date, reading time (unless disabled), and the page's curated
   *  top page_tags chips (meta.page_tags — ranked, title excluded, see extract.js). */
  const meta = use_page_meta()
  const metrics = meta.metrics || {}
  const mins = siteConfig.reading_time === false ? null : metrics.reading_time
  return (
    <>
      <PageHeader date={meta.published} reading_time={mins} />
      <TagList tags={meta.page_tags} />
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
  /** Custom h1 override: renders the heading with an "Info" toggle beside it, the page
   *  metadata (date/reading time/tags), then the expandable PageInfo panel when open. */
  const [info_open, set_info_open] = useState(false)
  return (
    <>
      <div className="page-title-row">
        <h1 className="nx-mt-2 nx-text-4xl nx-font-bold nx-tracking-tight nx-text-slate-900 dark:nx-text-slate-100">{children}</h1>
        <PageInfoToggle open={info_open} on_toggle={() => set_info_open(v => !v)} />
      </div>
      <PageMeta />
      {info_open && <PageInfoPanel />}
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
  // MetaSidebar renders "Edit this page" itself, last, after description/keywords/links/related.
  editLink: { component: () => null },
  toc: siteConfig.toc === false ? { component: () => null } : { extraContent: <MetaSidebar /> },
  components: { h1: PageTitle, SectionMarker },
  main: ({ children }) => <>{children}</>,
}
