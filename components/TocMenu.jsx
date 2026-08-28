/**
 * Mobile/tablet access to the right-hand ToC. Nextra hides `.nextra-toc` below the xl
 * breakpoint (1280px); TocMenuToggle appears in the page-title row at those widths and
 * expands TocMenuPanel inline under the page header (same content area as PageInfo) —
 * a labeled Sections list plus MetaSidebar (Related / Edit), each following display.toc.
 * The toggle itself follows display.title_row; open state is owned by the caller
 * (theme.config.jsx's PageTitle).
 */
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSection, section_anchor } from './SectionContext'
import MetaSidebar from './MetaSidebar'
import siteConfig from '../site.config'

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

export function TocMenuToggle({ open, on_toggle }) {
  const { page, sections } = useSection()
  if (!page) return null
  // Still show when there are no ## sections — MetaSidebar may still have Related/Edit
  return (
    <button
      type="button"
      className="toc-menu-toggle"
      aria-expanded={open}
      aria-controls="toc-menu-panel"
      aria-label={open ? 'Hide page contents' : 'Show page contents'}
      onClick={on_toggle}
    >
      <ListIcon />
      <span>Contents</span>
      {!!sections.length && <span className="toc-menu-count">{sections.length}</span>}
    </button>
  )
}

export function TocMenuPanel({ open, on_close }) {
  const { sections } = useSection()
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
    <section id="toc-menu-panel" className="toc-menu-panel" aria-label="Page contents">
      <h2 className="toc-menu-title">Page Contents</h2>

      {siteConfig.display.toc.includes('sections') && !!sections.length && (
        <div className="toc-menu-block">
          <h3 className="panel-label">Sections</h3>
          <ul className="toc-menu-list">
            {sections.map((section, i) => (
              <li key={`${section.name}-${i}`} className={section.level >= 3 ? 'toc-menu-sub' : undefined}>
                <a href={`#${section_anchor(section.name)}`} onClick={on_close}>
                  {section.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="toc-menu-meta">
        <MetaSidebar />
      </div>
    </section>
  )
}
