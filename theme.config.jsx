import { useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Breadcrumbs from './components/Breadcrumbs'
import PageHeader from './components/PageHeader'
import TagList from './components/TagList'
import PageContents, { TocTitle, TocExtra, TocHeading } from './components/PageContents'
import { ContentsToggle, ContentsPanel, close_contents_panel } from './components/ContentsMenu'
import SiteFooter from './components/SiteFooter'
import GitHubLink from './components/GitHubLink'
import FeedLink from './components/FeedLink'
import ThemeToggle from './components/ThemeToggle'
import { group_chips, header_field_keys } from './components/groups'
import IndexListing from './components/IndexListing'
import SidebarViews from './components/SidebarViews'
import PageRail from './components/PageRail'
import { PageHeading } from './components/PageChrome'
import { ViewScopeProvider } from './components/ViewScope'
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
  /** Metadata under the page title, driven by display.header: date and reading time in
   *  the metrics line, then facet chips, both in listed order. */
  const meta = use_page_meta()
  const header = siteConfig.display.header
  const chips = group_chips(meta.facets, header_field_keys(header))

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


function SidebarLabel({ title }) {
  /** Nextra's per-item label. Indexes replace the tree; they do not hide rows. */
  return <span>{title}</span>
}


function bg_rules(selector, value) {
  /** Custom navbar/footer colors only — primary/background/none live in global.css. */
  if (!value || value === 'primary' || value === 'background' || value === 'none') return ''
  return `${selector}{background-color:${value}!important}`
}


function chrome_head_script(navbar, footer) {
  const lines = []
  if (navbar) lines.push(`document.documentElement.dataset.chromeNavbar=${JSON.stringify(navbar)}`)
  if (footer) lines.push(`document.documentElement.dataset.chromeFooter=${JSON.stringify(footer)}`)
  if (!lines.length) return null
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `${lines.join(';')};`,
      }}
    />
  )
}


function chip_rules(groups, versioning) {
  /** One chip color pair per frontmatter field key, from its group or versioning hue. */
  const pair = (name, hue) =>
    `.chip-${name}{background:hsl(${hue} 70% 92%);color:hsl(${hue} 55% 32%)}` +
    `:is(html[class~="dark"]) .chip-${name}` +
    `{background:hsl(${hue} 35% 22%);color:hsl(${hue} 70% 75%)}`

  const rules = []
  if (versioning) rules.push(pair(versioning.key, versioning.hue))
  for (const spec of Object.values(groups || {})) {
    for (const key of spec.key || []) rules.push(pair(key, spec.hue))
  }
  return rules.join('')
}


const TOC_HAS_SECTIONS = siteConfig.display.toc.includes('sections')


const THEME_CSS = [
  siteConfig.theme.font_stack && `body{font-family:${siteConfig.theme.font_stack}}`,
  bg_rules('.nextra-nav-container-blur', siteConfig.theme.navbar),
  bg_rules('footer', siteConfig.theme.footer),
  chip_rules(siteConfig.frontmatter.facets, siteConfig.versioning),
].filter(Boolean).join('')


function PageTitle({ children }) {
  /** Custom h1 override: the breadcrumb row and the Contents action that shares it, the
   *  heading, page metadata, then the panel that action opens — the same sidebar body,
   *  inline, at widths where Nextra hides the sidebar. */
  const [open, set_open] = useState(false)
  const dismiss = useCallback(() => set_open(false), [])
  const close_panel = useCallback(
    () => close_contents_panel(dismiss),
    [dismiss],
  )

  return (
    <>
      <PageRail
        trail={<Breadcrumbs />}
        actions={<ContentsToggle open={open} on_toggle={() => set_open(v => !v)} />}
      />
      <PageHeading>{children}</PageHeading>
      <PageMeta />
      <ContentsPanel open={open} on_close={close_panel} on_route_close={dismiss} />
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
      {chrome_head_script(siteConfig.theme.navbar, siteConfig.theme.footer)}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      {siteConfig.description && <meta name="description" content={siteConfig.description} />}
      {THEME_CSS && <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />}
    </>
  ),
  feedback: { content: null },
  // Nextra renders editLink before toc.extraContent, so its own copy is disabled here —
  // PageContents renders "Edit this page" itself, last, after Related.
  editLink: { component: () => null },
  // With `sections` listed, Nextra owns the heading list (and its scroll-spy) and the
  // description rides in its title slot; otherwise PageContents renders the sidebar whole.
  toc: TOC_HAS_SECTIONS
    ? { title: <TocTitle />, extraContent: <TocExtra />, headingComponent: TocHeading }
    : { component: () => <PageContents order={siteConfig.display.toc} /> },
  components: { h1: PageTitle },
  sidebar: { titleComponent: SidebarLabel },
  // SidebarViews only portals facet value chips into the left nav.
  main: ({ children }) => (
    <ViewScopeProvider>
      <SidebarViews />
      <IndexListing>{children}</IndexListing>
    </ViewScopeProvider>
  ),
}
