/**
 * "Info" affordance for the page header. PageInfoToggle renders a small intelligence
 * icon beside the page title; clicking it expands PageInfoPanel below the header, which
 * shows an optional page description (frontmatter desc) and a per-section tag breakdown.
 * Each section shows at most `section_tags` chips. Sections pack into a content-sized mosaic.
 * Data comes from SectionContext. Open state is owned by theme.config.jsx's PageTitle.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSection } from './SectionContext'
import TagList from './TagList'
import siteConfig from '../site.config'

function section_has_tags(node) {
  return Array.isArray(node.tags) && node.tags.length > 0
}

export function limit_tags(tags, n) {
  /** Keep the first n tags (already user-first, then by score). */
  if (!Array.isArray(tags) || n <= 0) return []
  return tags.slice(0, n)
}

function tag_count(tags) {
  return Array.isArray(tags) ? tags.length : 0
}

export function layout_section_rows(sections) {
  /** Pack sections into mosaic rows (~sqrt(n) tiles per row). Within a row, flex-grow is
   *  proportional to tag weight; row height is content-driven so chips never clip. */
  if (!sections.length) return []
  const cols = Math.max(2, Math.ceil(Math.sqrt(sections.length)))
  const nodes = sections.map(section => ({
    section,
    weight: Math.max(tag_count(section.tags), 1),
  }))
  const rows = []
  for (let i = 0; i < nodes.length; i += cols) rows.push(nodes.slice(i, i + cols))
  return rows
}

export function section_anchor(name) {
  /** Fragment id matching Nextra's heading anchors (GitHub-style slug of the section name). */
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

function use_page_info() {
  const { page, sections } = useSection()
  const desc = (page && page.desc) || ''
  const max_tags = siteConfig.section_tags ?? 8
  const tagged_sections = (sections || [])
    .filter(section_has_tags)
    .map(section => ({ ...section, tags: limit_tags(section.tags, max_tags) }))
    .filter(section => section_has_tags(section))
  return { desc, tagged_sections, has_info: !!(desc || tagged_sections.length) }
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
  const { has_info } = use_page_info()
  if (!has_info) return null
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
  const { desc, tagged_sections, has_info } = use_page_info()
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

  if (!open || !has_info) return null

  const rows = layout_section_rows(tagged_sections)
  return (
    <section id="page-info-panel" className="page-info-panel" aria-labelledby="page-info-title">
      <h2 id="page-info-title" className="page-info-title">Page intelligence</h2>
      {desc && (
        <div className="page-info-summary">
          <h3 className="panel-label">Summary</h3>
          <p className="page-info-desc">{desc}</p>
        </div>
      )}
      {!!rows.length && (
        <div className="page-info-section-map">
          <h3 className="panel-label">Sections</h3>
          <div className="page-info-sections">
            {rows.map((row, ri) => (
              <div key={ri} className="page-info-row">
                {row.map(({ section, weight }, i) => (
                  <div
                    key={`${section.name}-${ri}-${i}`}
                    className="page-info-section"
                    style={{ flexGrow: weight }}
                  >
                    <a href={`#${section_anchor(section.name)}`} className="page-info-section-name">
                      {section.name}
                    </a>
                    <TagList tags={section.tags} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
