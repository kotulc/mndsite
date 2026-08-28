/**
 * "Contents" affordance for the page-title row. Nextra hides the right sidebar below the
 * xl breakpoint (1280px); ContentsToggle appears at those widths and expands
 * ContentsPanel inline under the page header, showing the same sidebar body in
 * `display.contents` order. Open state is owned by theme.config.jsx's PageTitle; the
 * toggle hides itself when the page has nothing to list.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSection } from './SectionContext'
import PageContents, { contents_items } from './PageContents'
import siteConfig from '../site.config'

const ORDER = siteConfig.display.contents


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


export function ContentsPanel({ open, on_close }) {
  const { events } = useRouter()

  useEffect(() => {
    if (!open) return
    function on_key(e) { if (e.key === 'Escape') on_close() }
    document.addEventListener('keydown', on_key)
    return () => document.removeEventListener('keydown', on_key)
  }, [open, on_close])

  useEffect(() => {
    if (!open) return
    function close() { on_close() }
    events.on('routeChangeStart', close)
    return () => events.off('routeChangeStart', close)
  }, [open, on_close, events])

  if (!open) return null

  return (
    <section id="contents-panel" className="contents-panel" aria-label="Page contents">
      <PageContents order={ORDER} on_navigate={on_close} />
    </section>
  )
}
