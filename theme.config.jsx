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
import { facet_chips } from './components/facets'
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


function header_facet_names(header) {
  /** Facets to chip, walking display.header: "facets" expands to every ui:chips facet,
   *  and a facet named directly is chipped wherever it appears, whatever its ui. */
  const declared = siteConfig.facets || {}
  const names = []
  for (const item of header) {
    if (item === 'facets') {
      for (const [name, facet] of Object.entries(declared)) {
        if (facet.ui === 'chips' && !names.includes(name)) names.push(name)
      }
    } else if (declared[item] && !names.includes(item)) {
      names.push(item)
    }
  }
  return names
}


function PageMeta() {
  /** Metadata under the page title, driven by display.header: date and reading time in
   *  the metrics line, then facet chips, both in listed order. */
  const meta = use_page_meta()
  const header = siteConfig.display.header
  const chips = facet_chips(meta.facets, header_facet_names(header))

  return (
    <>
      <PageHeader
        date={header.includes('date') ? meta.published : ''}
        reading_time={header.includes('reading_time') ? (meta.metrics || {}).reading_time : null}
        order={header}
      />
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


function chip_rules(facets) {
  /** One chip color pair per declared facet, from its resolved hue. */
  return Object.entries(facets || {}).map(([name, facet]) =>
    `.chip-${name}{background:hsl(${facet.hue} 70% 92%);color:hsl(${facet.hue} 55% 32%)}` +
    `:is(html[class~="dark"]) .chip-${name}` +
    `{background:hsl(${facet.hue} 35% 22%);color:hsl(${facet.hue} 70% 75%)}`
  ).join('')
}


const TOC_HAS_SECTIONS = siteConfig.display.toc.includes('sections')
const TOC_HAS_META = siteConfig.display.toc.some(item => item === 'related' || item === 'edit')


const THEME_CSS = [
  siteConfig.theme.font_stack && `body{font-family:${siteConfig.theme.font_stack}}`,
  bg_rules('.nextra-nav-container-blur', siteConfig.theme.navbar),
  bg_rules('footer.nx-bg-gray-100', siteConfig.theme.footer),
  chip_rules(siteConfig.facets),
].filter(Boolean).join('')


function PageTitle({ children }) {
  /** Custom h1 override: heading + the display.title_row actions, page metadata, and the
   *  panels those actions open. Info and Contents are mutually exclusive. */
  const [info_open, set_info_open] = useState(false)
  const [toc_open, set_toc_open] = useState(false)
  const title_row = siteConfig.display.title_row
  const show_info = title_row.includes('info')
  const show_contents = title_row.includes('contents')

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
          {show_info && <PageInfoToggle open={info_open} on_toggle={toggle_info} />}
          {show_contents && <TocMenuToggle open={toc_open} on_toggle={toggle_toc} />}
        </div>
      </div>
      <PageMeta />
      {show_info && <PageInfoPanel open={info_open} on_close={() => set_info_open(false)} />}
      {show_contents && <TocMenuPanel open={toc_open} on_close={() => set_toc_open(false)} />}
    </>
  )
}


export default {
  logo: <span style={{ fontWeight: 600 }}>{siteConfig.title}</span>,
  primaryHue: siteConfig.theme.hue,
  primarySaturation: siteConfig.theme.saturation,
  darkMode: false,   // the navbar toggle is ours; Nextra's sidebar copy is never used
  navbar: {
    extraContent: (
      <div className="navbar-icons">
        {siteConfig.display.navbar.map(item => {
          if (item === 'theme') return <ThemeToggle key={item} />
          if (item === 'feed') return <FeedLink key={item} />
          if (item === 'github') return <GitHubLink key={item} />
          return null
        })}
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
  toc: TOC_HAS_SECTIONS
    ? { extraContent: TOC_HAS_META ? <MetaSidebar /> : null }
    : { component: TOC_HAS_META ? () => <MetaSidebar /> : () => null },
  components: { h1: PageTitle },
  main: ({ children }) => <>{children}</>,
}
