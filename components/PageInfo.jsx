/**
 * "Info" affordance for the page header. PageInfoToggle renders a small intelligence
 * icon beside the page title; clicking it expands PageInfoPanel below the header, which
 * shows the supplied page description. Data comes from SectionContext, and open state is
 * owned by theme.config.jsx's PageTitle. Both render nothing when no description exists.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSection } from './SectionContext'


function use_page_desc() {
  const { page } = useSection()
  return (page && page.desc) || ''
}


function IntelligenceIcon({ size = 14 }) {
  // Sparkle glyph — reads as "AI/intelligence" rather than a plain info "i"
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2z" />
      <path d="M18.5 14l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z" />
    </svg>
  )
}


export function PageInfoToggle({ open, on_toggle }) {
  if (!use_page_desc()) return null
  return (
    <button
      type="button"
      className="page-info-toggle"
      aria-expanded={open}
      aria-controls="page-info-panel"
      aria-label={open ? 'Hide page info' : 'Show page info'}
      onClick={on_toggle}
    >
      <IntelligenceIcon />
      <span>Info</span>
    </button>
  )
}


export function PageInfoPanel({ open, on_close }) {
  const desc = use_page_desc()
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

  if (!open || !desc) return null

  return (
    <section id="page-info-panel" className="page-info-panel" aria-labelledby="page-info-title">
      <h2 id="page-info-title" className="page-info-title">Summary</h2>
      <p className="page-info-desc">{desc}</p>
    </section>
  )
}
