/**
 * "Contents" affordance for the page-title row. Nextra hides the right sidebar below the
 * xl breakpoint (1280px); ContentsToggle appears at those widths and expands
 * ContentsPanel inline under the page header, showing the same sidebar body in
 * `display.contents` order. Open state is owned by theme.config.jsx's PageTitle; the
 * toggle hides itself when the page has nothing to list.
 */
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { useSection } from './SectionContext'
import PageContents, { contents_items } from './PageContents'
import siteConfig from '../site.config'

const ORDER = siteConfig.display.contents


/** Close the inline panel without shifting the viewport when it sat above the fold. */
export function close_contents_panel(on_close) {
  const panel = document.getElementById('contents-panel')
  if (!panel) {
    on_close()
    return
  }
  const rect = panel.getBoundingClientRect()
  const panel_h = panel.offsetHeight
  const scroll_y = window.scrollY
  const panel_bottom = scroll_y + rect.top + panel_h

  on_close()

  if (scroll_y >= panel_bottom - 1) {
    requestAnimationFrame(() => {
      window.scrollTo(0, Math.max(0, scroll_y - panel_h))
    })
  }
}


function ListIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}


export function ContentsToggle({ open, on_toggle }) {
  const { page, sections } = useSection()
  const items = contents_items(ORDER, page, sections)
  if (!items.length) return null

  return (
    <button
      type="button"
      className="contents-toggle"
      aria-expanded={open}
      aria-controls="contents-panel"
      aria-label={open ? 'Hide page contents' : 'Show page contents'}
      onClick={on_toggle}
    >
      <ListIcon />
      <span>Contents</span>
      {items.includes('sections') && <span className="contents-count">{sections.length}</span>}
    </button>
  )
}


export function ContentsPanel({ open, on_close, on_route_close }) {
  const router = useRouter()
  const { page, sections } = useSection()
  const [frozen, set_frozen] = useState(null)
  const snapshot = useRef({ page, sections })
  snapshot.current = { page, sections }

  useEffect(() => {
    if (!open) {
      set_frozen(null)
      return
    }
    function on_key(e) { if (e.key === 'Escape') on_close() }
    document.addEventListener('keydown', on_key)
    return () => document.removeEventListener('keydown', on_key)
  }, [open, on_close])

  useEffect(() => {
    if (!open) return
    const finish = on_route_close ?? on_close
    function on_start() { set_frozen(snapshot.current) }
    function on_done() { set_frozen(null); finish() }
    router.events.on('routeChangeStart', on_start)
    router.events.on('routeChangeComplete', on_done)
    router.events.on('routeChangeError', on_done)
    return () => {
      router.events.off('routeChangeStart', on_start)
      router.events.off('routeChangeComplete', on_done)
      router.events.off('routeChangeError', on_done)
    }
  }, [open, on_close, on_route_close, router.events])

  if (!open) return null

  const view_page = frozen?.page ?? page
  const view_sections = frozen?.sections ?? sections

  return (
    <section id="contents-panel" className="contents-panel" aria-label="Page contents">
      <PageContents order={ORDER} on_navigate={on_close} page={view_page} sections={view_sections} />
    </section>
  )
}
